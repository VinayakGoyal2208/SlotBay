import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import * as M from "./models.js";
import { fail, requireUser, requireAdmin, encrypt, decrypt, auditAction } from "./security.js";
import { checkPaths, photoUrl, fileUrl } from "./files.js";
import {
  listingSchema,
  date,
  time,
  interval,
  withinOpening,
  peakOccupancy,
} from "./rules.js";
import { activeStatuses, createBooking, changeBooking, notify } from "./bookings.js";
import { claimIdentity } from "./identity.js";
import { changeRequestWrite } from "./change-requests.js";
export const resources = Router();
const mapping = {
  "change-requests": M.ChangeRequest,
  listings: M.Listing,
  bookings: M.Booking,
  "owner-applications": M.OwnerApplication,
  "driver-details": M.Vehicle,
  "listing-blocks": M.Block,
  notifications: M.Notification,
  disputes: M.Dispute,
  "pricing-guidelines": M.Guideline,
};
const admin = (a) => a.account_type === "admin";
function filters(req) {
  const fields = ["id", "user_id", "owner_id", "listing_id", "verified", "archived", "city"];
  const q = {};
  for (const f of fields)
    if (req.query[f] !== undefined) {
      const val = z.string().max(150).parse(req.query[f]);
      q[f === "id" ? "_id" : f] = ["verified", "archived"].includes(f) ? val === "true" : val;
    }
  if (req.query.listing_ids)
    q.listing_id = {
      $in: z.string().max(20000).parse(req.query.listing_ids).split(",").slice(0, 500),
    };
  return q;
}
export async function publicListing(listing) {
  const row = M.json(listing);
  row.host_id = row.owner_id;
  delete row.owner_id;
  const image = await photoUrl(row.photo_url);
  const images = (
    await Promise.all([row.photo_url, ...row.photo_paths].filter(Boolean).map((p) => photoUrl(p)))
  ).filter(Boolean);
  delete row.photo_url;
  delete row.photo_paths;
  return { row, image, images };
}
async function publicListings(listings) {
  const paths = listings.flatMap((l) => [l.photo_url, ...l.photo_paths]).filter(Boolean);
  const uploads = await M.Upload.find({ bucket: "listing-photos", path: { $in: paths } });
  const images = new Map(uploads.map((f) => [f.path, fileUrl(f)]));
  return listings.map((l) => {
    const row = M.json(l);
    const image = images.get(row.photo_url) ?? null;
    const gallery = [row.photo_url, ...row.photo_paths].map((p) => images.get(p)).filter(Boolean);
    row.host_id = row.owner_id;
    delete row.owner_id;
    delete row.photo_url;
    delete row.photo_paths;
    return { row, image, images: gallery };
  });
}
resources.get("/search", async (req, res) => {
  const q = { verified: true, archived: false };
  if (req.query.q) {
    const text = z
      .string()
      .trim()
      .max(150)
      .parse(req.query.q)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    q.$or = ["title", "area", "city", "address", "landmark", "owner_name"].map((k) => ({
      [k]: { $regex: text, $options: "i" },
    }));
  }
  if (req.query.city) q.city = z.string().max(80).parse(req.query.city);
  if (req.query.vehicle) q.vehicles = z.enum(["2W", "4W"]).parse(req.query.vehicle);
  if (req.query.lat || req.query.lng) {
    const lat = z.coerce.number().min(-90).max(90).parse(req.query.lat),
      lng = z.coerce.number().min(-180).max(180).parse(req.query.lng);
    q.point = {
      $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 10000 },
    };
  }
  const page = z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
  if (q.$text && q.point) {
    delete q.$text;
    const words = z
      .string()
      .max(150)
      .parse(req.query.q)
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    q.$or = ["title", "area", "city", "address", "landmark"].map((k) => ({
      [k]: { $regex: words, $options: "i" },
    }));
  }
  const query = M.Listing.find(q);
  if (!q.point) query.sort({ created_at: -1, _id: 1 });
  const listings = await query.skip((page - 1) * 60).limit(61);
  res.json({
    data: await publicListings(listings.slice(0, 60)),
    hasMore: listings.length > 60,
    page,
  });
});
resources.get("/spaces/:id", async (req, res) => {
  const l = await M.Listing.findOne({ _id: req.params.id, verified: true, archived: false });
  if (!l) fail(404, "Parking space not found");
  res.json(await publicListing(l));
});
resources.get("/availability", async (req, res) => {
  const times = interval(req.query);
  const ids = z.string().max(8000).optional().parse(req.query.ids)?.split(",").slice(0, 100);
  const listings = await M.Listing.find({
    verified: true,
    archived: false,
    ...(ids ? { _id: { $in: ids } } : {}),
  }).limit(100);
  const listingIds = listings.map((l) => l._id);
  const [bookings, blocks] = await Promise.all([
    M.Booking.find({
      listing_id: { $in: listingIds },
      status: { $in: activeStatuses },
      starts_at: { $lt: times.end },
      ends_at: { $gt: times.start },
    }),
    M.Block.find({ listing_id: { $in: listingIds } }),
  ]);
  const { capacity } = await import("./rules.js");
  res.json(
    listings.map((l) => ({
      id: l._id,
      available: capacity(
        l,
        bookings.filter((b) => b.listing_id === l._id),
        blocks.filter((b) => b.listing_id === l._id),
        times.start,
        times.end,
      ),
    })),
  );
});
resources.get("/reports", async (req, res) => {
  requireAdmin(req);
  const [users, owners, listings, statuses, payments] = await Promise.all([
    M.User.countDocuments(),
    M.Owner.countDocuments(),
    M.Listing.aggregate([
      { $group: { _id: null, locations: { $sum: 1 }, bays: { $sum: "$total" } } },
    ]),
    M.Booking.aggregate([
      {
        $group: {
          _id: "$status",
          bookings: { $sum: 1 },
          hours: { $sum: "$hours" },
          reservation_value: { $sum: "$amount" },
        },
      },
    ]),
    M.Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, amount_minor: { $sum: "$amount_minor" } } },
    ]),
  ]);
  const now = new Date(),
    from = new Date(+now - 30 * 86400000);
  const recent = await M.Booking.find({
    status: { $in: ["Confirmed", "Completed"] },
    starts_at: { $lt: now },
    ends_at: { $gt: from },
  });
  const occupied = recent.reduce(
    (n, b) => n + (Math.min(+b.ends_at, +now) - Math.max(+b.starts_at, +from)) / 3600000,
    0,
  );
  const bays = listings[0]?.bays || 0;
  res.json({
    registered_users: users,
    registered_owners: owners,
    locations: listings[0]?.locations || 0,
    bays,
    statuses,
    collected_revenue_inr: (payments[0]?.amount_minor || 0) / 100,
    utilization_30d_percent: bays ? (occupied / (bays * 720)) * 100 : 0,
    utilization_note:
      "Booked hours / current listed bays × 720 hours. Includes archived inventory; not sensor occupancy.",
    conversion_rate: null,
    search_time_reduction: null,
    measurement_note:
      "Conversion and search-time reduction require consented event instrumentation and a baseline.",
  });
});
resources.get("/:resource", async (req, res) => {
  const a = requireUser(req),
    r = req.params.resource,
    f = filters(req);
  if (r === "profiles") {
    const rows = admin(a)
      ? [...(await M.User.find(f)), ...(await M.Owner.find(f)), ...(await M.Admin.find(f))]
      : [await M.profileModel(a.account_type).findById(a._id)];
    return res.json(rows.filter(Boolean).map(M.json));
  }
  if (r === "user-roles") {
    const roles = [a.account_type === "admin" ? "admin" : "user"];
    if (
      a.account_type === "owner" &&
      (await M.OwnerApplication.exists({ user_id: a._id, status: "approved" }))
    )
      roles.push("owner");
    return res.json(roles.map((role) => ({ id: `${a._id}-${role}`, user_id: a._id, role })));
  }
  const model = mapping[r];
  if (!model) fail(404, "Unknown resource");
  let scope = {};
  if (!admin(a)) {
    if (r === "listings") scope.owner_id = a._id;
    else if (r === "bookings")
      scope =
        a.account_type === "owner"
          ? {
              listing_id: {
                $in: (await M.Listing.find({ owner_id: a._id }).select("_id")).map((l) => l._id),
              },
            }
          : { user_id: a._id };
    else if (r === "listing-blocks")
      scope.listing_id = {
        $in: (await M.Listing.find({ owner_id: a._id }).select("_id")).map((l) => l._id),
      };
    else if (r !== "pricing-guidelines") scope.user_id = a._id;
  }
  // Notifications remain personal even for administrators.
  if (r === "notifications") scope.user_id = a._id;
  const sortField = ["created_at", "updated_at", "submitted_at"].includes(req.query.sort)
    ? req.query.sort
    : "created_at";
  const page = z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
  const limit = z.coerce.number().int().min(1).max(200).default(200).parse(req.query.limit);
  const docs = await model
    .find({ $and: [f, scope] })
    .sort({ [sortField]: req.query.direction === "asc" ? 1 : -1, _id: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
  const rows = docs.map(M.json);
  if (r === "change-requests")
    for (const row of rows)
      if (row.category === "owner") {
        row.proposed.id_number = decrypt(row.proposed.id_number);
        row.proposed.account_number = decrypt(row.proposed.account_number);
      }
  if (r === "owner-applications")
    for (const row of rows) {
      row.id_number = decrypt(row.id_number);
      row.account_number = decrypt(row.account_number);
    }
  if (r === "bookings") {
    const ls = await M.Listing.find({ _id: { $in: rows.map((b) => b.listing_id) } });
    const people = await M.User.find({
      _id: { $in: rows.filter((b) => !b.arrival?.full_name).map((b) => b.user_id) },
    });
    for (const row of rows) {
      const l = ls.find((l) => l._id === row.listing_id);
      row.listings = l
        ? {
            title: l.title,
            image_key: l.image_key,
            area: l.area,
            address: l.address,
            owner_name: l.owner_name,
          }
        : null;
      if (!row.arrival?.full_name) {
        const p = people.find((p) => p._id === row.user_id);
        row.arrival = {
          full_name: p?.full_name || "Driver",
          phone: p?.phone || "",
          documents: ["Driving licence", "Vehicle RC"],
        };
      }
    }
  }
  res.set("X-Has-More", String(rows.length === limit)).json(rows);
});
async function ownerCheck(a, session) {
  if (
    a.account_type !== "owner" ||
    !(await M.OwnerApplication.exists({ user_id: a._id, status: "approved" }).session(
      session || null,
    ))
  )
    fail(403, "Verified owner account required");
}
async function listingWrite(req, id) {
  const a = requireUser(req);
  let result;
  await mongoose.connection.transaction(async (session) => {
    let l = id
      ? await M.Listing.findOneAndUpdate(
          { _id: id },
          { $inc: { revision: 1 } },
          { new: true, session },
        )
      : null;
    if (id && !l) fail(404, "Listing not found");
    if (admin(a)) {
      if (!l) fail(403, "Create listings through an owner account");
      const v = z
        .object({ verified: z.boolean().optional(), archived: z.boolean().optional() })
        .strict()
        .parse(req.body);
      if (
        v.verified &&
        (!(await M.OwnerApplication.exists({ user_id: l.owner_id, status: "approved" }).session(
          session,
        )) ||
          (await M.Auth.exists({ _id: l.owner_id, suspended: true }).session(session)))
      )
        fail(409, "Owner must be approved and active");
      Object.assign(l, v);
      await l.save({ session });
      result = l;
      await auditAction(session, a, "listing.review", id);
      return;
    }
    await ownerCheck(a, session);
    if (l && l.owner_id !== a._id) fail(403, "This listing belongs to another owner");
    if (l && Object.keys(req.body).length === 1 && "total" in req.body) {
      const total = z.number().int().min(1).max(500).parse(req.body.total);
      const bookings = await M.Booking.find({
        listing_id: l._id,
        status: { $in: activeStatuses },
        ends_at: { $gt: new Date() },
      }).session(session);
      if (total < peakOccupancy(bookings, new Date(), new Date("9999-01-01")))
        fail(
          409,
          "Capacity cannot fall below bays already reserved. Keep enough bays for existing bookings.",
        );
      l.total = total;
      await l.save({ session });
      result = l;
      await auditAction(session, a, "listing.capacity", id);
      return;
    }
    if (l && Object.keys(req.body).every((k) => ["archived", "auto_approve"].includes(k))) {
      const v = z
        .object({ archived: z.boolean().optional(), auto_approve: z.boolean().optional() })
        .strict()
        .parse(req.body);
      if (v.auto_approve === false)
        fail(400, "Reservations are confirmed immediately when capacity is available");
      if (v.archived === false) l.verified = false;
      Object.assign(l, v);
      await l.save({ session });
      result = l;
      return;
    }
    const { owner_id, open_window, ...input } = req.body;
    if (owner_id && owner_id !== a._id) fail(403, "Cannot change listing owner");
    const v = listingSchema.parse(input);
    // Reject unrecognised sensitive fields instead of silently trusting them.
    for (const k of Object.keys(input)) if (!(k in v)) fail(400, `Unsupported listing field: ${k}`);
    await checkPaths(a._id, "listing-photos", [v.photo_url, ...v.photo_paths], session);
    if (l) {
      const bookings = await M.Booking.find({
        listing_id: l._id,
        status: { $in: activeStatuses },
        ends_at: { $gt: new Date() },
      }).session(session);
      if (
        bookings.length &&
        (v.total < peakOccupancy(bookings, new Date(), new Date("9999-01-01")) ||
          bookings.some(
            (b) => !v.vehicles.includes(b.vehicle) || !withinOpening(v, b.starts_at, b.ends_at),
          ) ||
          v.lat !== l.lat ||
          v.lng !== l.lng ||
          v.address !== l.address)
      )
        fail(
          409,
          "This change would invalidate existing bookings; finish those reservations first",
        );
    }
    const profile = await M.Owner.findById(a._id).session(session);
    const values = {
      ...v,
      owner_id: a._id,
      owner_name: profile.full_name,
      verified: false,
      point: { type: "Point", coordinates: [v.lng, v.lat] },
      open_window: v.opens_at === v.closes_at ? "24 × 7" : `${v.opens_at} – ${v.closes_at}`,
    };
    if (l) {
      Object.assign(l, values);
      await l.save({ session });
    } else [l] = await M.Listing.create([values], { session });
    await M.Location.updateOne(
      { listing_id: l._id },
      { $set: { city: v.city, area: v.area, address: v.address, point: values.point } },
      { upsert: true, session },
    );
    result = l;
  });
  return M.json(result);
}
async function applicationWrite(req, id) {
  const a = requireUser(req);
  if (admin(a)) {
    const v = z
      .object({
        status: z.enum(["approved", "rejected"]),
        admin_note: z.string().max(300).nullable(),
      })
      .strict()
      .parse(req.body);
    if (v.status === "rejected" && !v.admin_note?.trim())
      fail(400, "A rejection reason is required");
    let result;
    await mongoose.connection.transaction(async (session) => {
      const previous = await M.OwnerApplication.findOne({ user_id: id }).session(session);
      if (!previous) fail(404, "Owner application not found");
      result = await M.OwnerApplication.findOneAndUpdate(
        { user_id: id },
        {
          $set: {
            ...v,
            reviewed_at: new Date(),
            ...(v.status === "approved" ? { locked_at: new Date() } : {}),
          },
        },
        { new: true, session },
      );
      if (!result) fail(404, "Owner application not found");
      if (v.status === "approved" && previous.status !== "approved")
        await M.EmailJob.create([{ user_id: id, kind: "owner-approved" }], { session });
      if (v.status === "rejected")
        await M.Listing.updateMany(
          { owner_id: id },
          { $set: { verified: false }, $inc: { revision: 1 } },
          { session },
        );
      await auditAction(session, a, "owner.review", id);
      await notify(
        session,
        id,
        null,
        `Owner verification ${v.status}${v.admin_note ? ": " + v.admin_note : "."}`,
      );
    });
    return {
      ...M.json(result),
      id_number: decrypt(result.id_number),
      account_number: decrypt(result.account_number),
    };
  }
  if (a.account_type !== "owner" || (id && id !== a._id) || req.body.user_id !== a._id)
    fail(403, "Owner account required");
  const v = z
    .object({
      user_id: z.string(),
      id_type: z.enum(["aadhaar", "pan", "dl"]),
      id_number: z.string().min(10).max(20),
      property_doc_type: z.enum(["sale_deed", "rental_agreement", "electricity_bill"]),
      place_address: z.string().trim().min(10).max(300),
      account_holder: z.string().trim().min(3).max(100),
      account_number: z.string().regex(/^\d{9,18}$/),
      ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
      id_doc_path: z.string().max(300),
      property_doc_path: z.string().max(300),
      photo_paths: z.array(z.string().max(300)).min(2).max(6),
    })
    .strict()
    .parse(req.body);
  // The same checksum and name matching used by the existing UI is enforced here.
  const { idNumberValid, namesMatch } = await import("../src/lib/validation.js");
  const p = await M.Owner.findById(a._id);
  if (idNumberValid(v.id_type, v.id_number) || !namesMatch(v.account_holder, p.full_name))
    fail(400, "Identity or account-holder details do not match");
  await checkPaths(a._id, "documents", [v.id_doc_path, v.property_doc_path, ...v.photo_paths]);
  let result;
  await mongoose.connection.transaction(async (session) => {
    const old = await M.OwnerApplication.findOne({ user_id: a._id }).session(session);
    if (old?.status === "approved" || old?.locked_at)
      fail(409, "Approved owner details require administrator review to change");
    await claimIdentity(a._id, `owner_id:${v.id_type}`, v.id_number, session);
    result = await M.OwnerApplication.findOneAndUpdate(
      { user_id: a._id },
      {
        $set: {
          ...v,
          id_number: encrypt(v.id_number),
          account_number: encrypt(v.account_number),
          status: "pending",
          admin_note: null,
          submitted_at: new Date(),
        },
      },
      { upsert: true, new: true, session },
    );
  });
  return { ...M.json(result), id_number: v.id_number, account_number: v.account_number };
}
async function vehicleWrite(req, id) {
  const a = requireUser(req);
  let result;
  if (admin(a)) {
    const v = z
      .object({
        status: z.enum(["approved", "rejected"]),
        admin_note: z.string().trim().max(300).nullable(),
      })
      .strict()
      .parse(req.body);
    if (v.status === "rejected" && !v.admin_note) fail(400, "A rejection reason is required");
    await mongoose.connection.transaction(async (session) => {
      await M.Auth.updateOne({ _id: id }, { $inc: { version: 1 } }, { session });
      result = await M.Vehicle.findOneAndUpdate(
        { user_id: id },
        { $set: { ...v, reviewed_at: new Date() } },
        { new: true, session },
      );
      if (!result) fail(404, "Driver not found");
      await notify(
        session,
        id,
        null,
        `Driver record ${v.status === "approved" ? "restored" : "restricted"}${v.admin_note ? ": " + v.admin_note : "."}`,
      );
      await auditAction(session, a, "driver.review", id);
    });
    return M.json(result);
  }
  if (a.account_type !== "user" || req.body.user_id !== a._id || (id && id !== a._id))
    fail(403, "Driver account required");
  const { driverSchema } = await import("../src/lib/validation.js");
  const v = driverSchema.parse(req.body);
  const paths = z
    .object({ licence_path: z.string().min(1).max(300), rc_path: z.string().min(1).max(300) })
    .parse(req.body);
  for (const k of Object.keys(req.body))
    if (
      !["user_id", "vehicle_type", "plate", "licence_number", "licence_path", "rc_path"].includes(k)
    )
      fail(400, "Unsupported vehicle field");
  await mongoose.connection.transaction(async (session) => {
    await M.Auth.updateOne({ _id: a._id }, { $inc: { version: 1 } }, { session });
    const old = await M.Vehicle.findOne({ user_id: a._id }).session(session);
    if (
      old &&
      (old.status === "rejected" ||
        old.plate !== v.plate ||
        old.licence_number !== v.licence_number ||
        old.vehicle_type !== v.vehicle_type ||
        (old.licence_path && old.licence_path !== paths.licence_path) ||
        (old.rc_path && old.rc_path !== paths.rc_path))
    )
      fail(
        409,
        "Your registered details are locked. Submit a change request to the administrator.",
      );
    await checkPaths(a._id, "documents", Object.values(paths), session);
    await claimIdentity(a._id, "plate", v.plate, session);
    await claimIdentity(a._id, "licence_number", v.licence_number, session);
    result = await M.Vehicle.findOneAndUpdate(
      { user_id: a._id },
      { $set: { ...v, ...paths, status: "approved", locked_at: old?.locked_at || new Date() } },
      { upsert: true, new: true, session },
    );
    await notify(
      session,
      a._id,
      null,
      "Driver documents saved. You can reserve immediately. Carry your driving licence and vehicle RC on arrival.",
    );
  });
  return M.json(result);
}
async function blockWrite(req, id, remove = false) {
  const a = requireUser(req);
  let result;
  await mongoose.connection.transaction(async (session) => {
    const old = id ? await M.Block.findById(id).session(session) : null;
    if (remove && !old) fail(404, "Block not found");
    const listingId = old?.listing_id || z.string().parse(req.body.listing_id);
    const l = await M.Listing.findOneAndUpdate(
      { _id: listingId },
      { $inc: { revision: 1 } },
      { new: true, session },
    );
    if (!l || (l.owner_id !== a._id && !admin(a))) fail(403, "Listing access denied");
    if (remove) {
      await M.Block.deleteOne({ _id: id }, { session });
      result = {};
      return;
    }
    const v = z
      .object({
        listing_id: z.string(),
        block_date: date,
        starts_at: time.nullable(),
        ends_at: time.nullable(),
      })
      .strict()
      .parse(req.body);
    if (!!v.starts_at !== !!v.ends_at || (v.starts_at && v.ends_at <= v.starts_at))
      fail(400, "Block end must follow its start");
    const start = new Date(`${v.block_date}T${v.starts_at || "00:00"}:00+05:30`),
      end = v.ends_at
        ? new Date(`${v.block_date}T${v.ends_at}:00+05:30`)
        : new Date(+start + 86400000);
    if (+end < Date.now()) fail(400, "Choose a future block");
    if (
      await M.Booking.exists({
        listing_id: l._id,
        status: { $in: activeStatuses },
        starts_at: { $lt: end },
        ends_at: { $gt: start },
      }).session(session)
    )
      fail(409, "A block cannot overlap existing reservations");
    [result] = await M.Block.create([v], { session });
  });
  return M.json(result);
}
async function mutate(req, id) {
  const a = requireUser(req),
    r = req.params.resource;
  if (r === "change-requests") return changeRequestWrite(req, id);
  if (r === "listings") return listingWrite(req, id);
  if (r === "bookings") return id ? changeBooking(req, id) : createBooking(req);
  if (r === "owner-applications") return applicationWrite(req, id);
  if (r === "driver-details") return vehicleWrite(req, id);
  if (r === "listing-blocks") return blockWrite(req, id);
  if (r === "profiles" && id) {
    const target = await M.Auth.findById(id);
    if (!target) fail(404, "Account not found");
    if (admin(a) && "suspended" in req.body) {
      const { suspended } = z.object({ suspended: z.boolean() }).strict().parse(req.body);
      if (target.account_type === "admin")
        fail(403, "Admin accounts cannot be suspended through this screen");
      await mongoose.connection.transaction(async (session) => {
        await M.Auth.updateOne({ _id: id }, { $set: { suspended } }, { session });
        await M.profileModel(target.account_type).updateOne(
          { _id: id },
          { $set: { suspended } },
          { session },
        );
        if (suspended) {
          await M.Session.deleteMany({ user_id: id }, { session });
          await M.Listing.updateMany(
            { owner_id: id },
            { $set: { verified: false }, $inc: { revision: 1 } },
            { session },
          );
        }
        await auditAction(session, a, suspended ? "account.suspend" : "account.restore", id);
      });
      return { id, suspended };
    }
    fail(
      409,
      "Registered profile details are locked. Submit a change request to the administrator.",
    );
  }
  if (r === "notifications" && id) {
    z.object({ read_at: z.string().datetime() }).strict().parse(req.body);
    const n = await M.Notification.findOneAndUpdate(
      { _id: id, user_id: a._id },
      { $set: { read_at: new Date() } },
      { new: true },
    );
    if (!n) fail(404, "Notification not found");
    return M.json(n);
  }
  if (r === "disputes") {
    if (id) {
      requireAdmin(req);
      z.object({ status: z.literal("Resolved") })
        .strict()
        .parse(req.body);
      const d = await M.Dispute.findByIdAndUpdate(
        id,
        { $set: { status: "Resolved" } },
        { new: true },
      );
      if (!d) fail(404, "Dispute not found");
      return M.json(d);
    }
    const v = z
      .object({
        user_id: z.string(),
        booking_id: z.string(),
        message: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(req.body);
    if (v.user_id !== a._id || !(await M.Booking.exists({ _id: v.booking_id, user_id: a._id })))
      fail(403, "Disputes must refer to your own booking");
    return M.json(await M.Dispute.create(v));
  }
  if (r === "pricing-guidelines") {
    requireAdmin(req);
    const v = z
      .object({
        city: z.string().trim().min(2).max(80),
        hourly_min: z.number().min(0),
        hourly_max: z.number().max(10000),
        note: z.string().max(500),
      })
      .strict()
      .parse(req.body);
    if (v.hourly_max < v.hourly_min) fail(400, "Maximum must be above minimum");
    return M.json(
      await M.Guideline.findOneAndUpdate(
        { city: v.city },
        { $set: { ...v, updated_by: a._id } },
        { upsert: true, new: true },
      ),
    );
  }
  fail(405, "Unsupported operation");
}
resources.post("/:resource", async (req, res) => res.status(201).json(await mutate(req)));
resources.patch("/:resource/:id", async (req, res) => res.json(await mutate(req, req.params.id)));
resources.delete("/:resource/:id", async (req, res) => {
  if (req.params.resource !== "listing-blocks")
    fail(405, "Archive records instead of deleting history");
  res.json(await blockWrite(req, req.params.id, true));
});
