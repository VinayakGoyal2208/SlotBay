import mongoose from "mongoose";
import { z } from "zod";
import * as M from "./models.js";
import { fail, requireUser, requireAdmin, encrypt, decrypt, auditAction } from "./security.js";
import { claimIdentity } from "./identity.js";
import { checkPaths } from "./files.js";
import { notify } from "./bookings.js";
import {
  nameRule,
  phoneRule,
  driverSchema,
  ownerSchema,
  namesMatch,
} from "../src/lib/validation.js";

function parseChanges(category, proposed) {
  if (category === "profile")
    return z.object({ full_name: nameRule, phone: phoneRule }).strict().parse(proposed);
  if (category === "vehicle") {
    const fields = z
      .object({
        vehicle_type: z.enum(["2W", "4W"]),
        plate: z.string(),
        licence_number: z.string(),
        licence_path: z.string().min(1).max(300),
        rc_path: z.string().min(1).max(300),
      })
      .strict()
      .parse(proposed);
    return { ...fields, ...driverSchema.parse(fields) };
  }
  const fields = z
    .object({
      id_type: z.enum(["aadhaar", "pan", "dl"]),
      id_number: z.string(),
      property_doc_type: z.enum(["sale_deed", "rental_agreement", "electricity_bill"]),
      place_address: z.string(),
      account_holder: z.string(),
      account_number: z.string(),
      ifsc: z.string(),
      id_doc_path: z.string().min(1).max(300),
      property_doc_path: z.string().min(1).max(300),
      photo_paths: z.array(z.string().min(1).max(300)).min(2).max(6),
    })
    .strict()
    .parse(proposed);
  const { confirm_account: _, ...validated } = ownerSchema.parse({
    ...fields,
    confirm_account: fields.account_number,
  });
  return { ...fields, ...validated };
}
export async function changeRequestWrite(req, id) {
  const a = requireUser(req);
  if (!id) {
    if (!["user", "owner"].includes(a.account_type))
      fail(403, "Only drivers and owners can submit requests");
    const v = z
      .object({
        category: z.enum(["profile", "vehicle", "owner"]),
        message: z.string().trim().min(10).max(1000),
        proposed: z.record(z.unknown()),
      })
      .strict()
      .parse(req.body);
    if (
      (v.category === "vehicle" && a.account_type !== "user") ||
      (v.category === "owner" && a.account_type !== "owner")
    )
      fail(403, "This change does not belong to your account");
    const proposed = parseChanges(v.category, v.proposed);
    const paths =
      v.category === "vehicle"
        ? [proposed.licence_path, proposed.rc_path]
        : v.category === "owner"
          ? [proposed.id_doc_path, proposed.property_doc_path, ...proposed.photo_paths]
          : [];
    await checkPaths(a._id, "documents", paths);
    if (v.category === "owner") {
      const p = await M.Owner.findById(a._id);
      if (!namesMatch(proposed.account_holder, p.full_name))
        fail(
          400,
          "Account holder must match the registered name. Request a profile correction first if needed.",
        );
    }
    let row;
    await mongoose.connection.transaction(async (session) => {
      await M.Auth.updateOne({ _id: a._id }, { $inc: { version: 1 } }, { session });
      if (
        await M.ChangeRequest.exists({
          user_id: a._id,
          category: v.category,
          status: "Open",
        }).session(session)
      )
        fail(409, "You already have an open request of this type");
      // Encrypt proposed sensitive values, just like the approved owner record.
      if (v.category === "owner") {
        proposed.id_number = encrypt(proposed.id_number);
        proposed.account_number = encrypt(proposed.account_number);
      }
      [row] = await M.ChangeRequest.create([{ ...v, proposed, user_id: a._id }], { session });
      await notify(
        session,
        a._id,
        null,
        "Your profile change request has been sent to the administrator.",
      );
    });
    return M.json(row);
  }
  requireAdmin(req);
  const v = z
    .object({
      status: z.enum(["Approved", "Rejected"]),
      admin_note: z.string().trim().min(3).max(500),
    })
    .strict()
    .parse(req.body);
  let result;
  await mongoose.connection.transaction(async (session) => {
    const r = await M.ChangeRequest.findOne({ _id: id, status: "Open" }).session(session);
    if (!r) fail(409, "Request has already been resolved or does not exist");
    const target = await M.Auth.findOneAndUpdate(
      { _id: r.user_id },
      { $inc: { version: 1 } },
      { new: true, session },
    );
    if (!target) fail(404, "Account not found");
    if (v.status === "Approved") {
      const proposed = { ...r.proposed };
      if (r.category === "owner") {
        proposed.id_number = decrypt(proposed.id_number);
        proposed.account_number = decrypt(proposed.account_number);
      }
      const data = parseChanges(r.category, proposed);
      if (r.category === "profile") {
        await claimIdentity(target._id, "phone", data.phone, session);
        if (target.account_type === "owner") {
          const app = await M.OwnerApplication.findOne({
            user_id: target._id,
            status: "approved",
          }).session(session);
          if (app && !namesMatch(app.account_holder, data.full_name))
            fail(
              409,
              "Name must match the verified account holder. Resolve the identity records together through administrator support.",
            );
          await M.Listing.updateMany(
            { owner_id: target._id },
            { $set: { owner_name: data.full_name }, $inc: { revision: 1 } },
            { session },
          );
        }
        await M.profileModel(target.account_type).updateOne(
          { _id: target._id },
          { $set: data },
          { session },
        );
      } else if (r.category === "vehicle") {
        if (
          await M.Booking.exists({
            user_id: target._id,
            status: { $in: ["Pending", "Confirmed"] },
            ends_at: { $gt: new Date() },
          }).session(session)
        )
          fail(409, "Finish or cancel existing reservations before changing the vehicle");
        await checkPaths(target._id, "documents", [data.licence_path, data.rc_path], session);
        await claimIdentity(target._id, "plate", data.plate, session);
        await claimIdentity(target._id, "licence_number", data.licence_number, session);
        await M.Vehicle.updateOne(
          { user_id: target._id },
          {
            $set: {
              ...data,
              status: "approved",
              locked_at: new Date(),
              reviewed_at: new Date(),
              admin_note: v.admin_note,
            },
          },
          { upsert: true, session },
        );
      } else {
        const profile = await M.Owner.findById(target._id).session(session);
        if (!profile || !namesMatch(data.account_holder, profile.full_name))
          fail(400, "Account holder does not match the owner");
        await checkPaths(
          target._id,
          "documents",
          [data.id_doc_path, data.property_doc_path, ...data.photo_paths],
          session,
        );
        await claimIdentity(target._id, `owner_id:${data.id_type}`, data.id_number, session);
        await M.OwnerApplication.updateOne(
          { user_id: target._id },
          {
            $set: {
              ...data,
              id_number: encrypt(data.id_number),
              account_number: encrypt(data.account_number),
              status: "approved",
              locked_at: new Date(),
              reviewed_at: new Date(),
              admin_note: v.admin_note,
            },
          },
          { upsert: true, session },
        );
      }
    }
    Object.assign(r, v, { resolved_at: new Date(), resolved_by: a._id });
    await r.save({ session });
    result = r;
    await auditAction(session, a, `change-request.${v.status.toLowerCase()}`, id);
    await notify(
      session,
      r.user_id,
      null,
      `Your ${r.category} change request was ${v.status.toLowerCase()}: ${v.admin_note}`,
    );
  });
  return M.json(result);
}
