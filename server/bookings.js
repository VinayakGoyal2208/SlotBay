import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  Listing,
  Booking,
  Block,
  Vehicle,
  OwnerApplication,
  Auth,
  Notification,
  Payment,
  User,
  json,
} from "./models.js";
import { fail, requireUser } from "./security.js";
import { interval, capacity, priceFor } from "./rules.js";
export const activeStatuses = ["Pending", "Confirmed"];
export async function available(listing, times, session) {
  const bookings = await Booking.find({
    listing_id: listing._id,
    status: { $in: activeStatuses },
    starts_at: { $lt: times.end },
    ends_at: { $gt: times.start },
  }).session(session || null);
  const blocks = await Block.find({ listing_id: listing._id }).session(session || null);
  return capacity(listing, bookings, blocks, times.start, times.end);
}
export async function notify(session, user_id, booking_id, message) {
  await Notification.create([{ user_id, booking_id, message }], { session });
}
export async function createBooking(req) {
  const a = requireUser(req);
  if (a.account_type !== "user") fail(403, "Use a driver account to reserve parking");
  const v = z
    .object({
      user_id: z.string().optional(),
      listing_id: z.string().min(1).max(100),
      booking_date: z.string(),
      start_time: z.string(),
      hours: z.number(),
      vehicle: z.enum(["2W", "4W"]),
      plate: z.string(),
    })
    .strict()
    .parse(req.body);
  if (v.user_id && v.user_id !== a._id) fail(403, "Cannot book for another account");
  const key = z.string().min(16).max(100).parse(req.get("Idempotency-Key"));
  const times = interval({ date: v.booking_date, start: v.start_time, hours: v.hours });
  if (+times.start < Date.now() || +times.start > Date.now() + 365 * 86400000)
    fail(400, "Arrival must be in the future and within one year");
  let result;
  await mongoose.connection.transaction(async (session) => {
    if (
      !(await Auth.findOneAndUpdate(
        { _id: a._id, suspended: false },
        { $inc: { version: 1 } },
        { session },
      ))
    )
      fail(403, "Account unavailable");
    const existing = await Booking.findOne({ user_id: a._id, idempotency_key: key }).session(
      session,
    );
    if (existing) {
      if (
        existing.listing_id !== v.listing_id ||
        +existing.starts_at !== +times.start ||
        existing.hours !== v.hours ||
        existing.vehicle !== v.vehicle
      )
        fail(409, "Idempotency key already used for a different reservation");
      result = existing;
      return;
    }
    // Every booking, block and listing mutation writes this document first. MongoDB
    // retries conflicting transactions against fresh capacity, across all API replicas.
    const listing = await Listing.findOneAndUpdate(
      { _id: v.listing_id },
      { $inc: { revision: 1 } },
      { new: true, session },
    );
    if (!listing || !listing.verified || listing.archived) fail(404, "Listing is unavailable");
    const owner = await Auth.findById(listing.owner_id).session(session);
    if (!owner || owner.suspended) fail(409, "Owner is unavailable");
    const approved = await OwnerApplication.exists({
      user_id: listing.owner_id,
      status: "approved",
    }).session(session);
    if (!approved) fail(409, "Owner verification is required");
    const driver = await Vehicle.findOne({ user_id: a._id }).session(session);
    if (!driver || driver.status === "rejected")
      fail(403, "Complete your driver profile or contact the administrator");
    if (!driver.licence_path || !driver.rc_path)
      fail(403, "Upload your driving licence and vehicle RC in your profile before booking");
    const profile = await User.findById(a._id).session(session);
    if (
      driver.vehicle_type !== v.vehicle ||
      driver.plate !== v.plate ||
      !listing.vehicles.includes(v.vehicle)
    )
      fail(400, "Vehicle is not compatible with this reservation");
    if (!(await available(listing, times, session))) fail(409, "No bays remain for this interval");
    [result] = await Booking.create(
      [
        {
          user_id: a._id,
          listing_id: listing._id,
          code: `SB-${randomBytes(6).toString("hex").toUpperCase()}`,
          booking_date: v.booking_date,
          start_time: v.start_time,
          hours: v.hours,
          starts_at: times.start,
          ends_at: times.end,
          vehicle: driver.vehicle_type,
          plate: driver.plate,
          amount: priceFor(listing, v.hours),
          price_snapshot: {
            hourly: listing.hourly,
            daily: listing.daily,
            monthly: listing.monthly,
          },
          status: "Confirmed",
          idempotency_key: key,
          arrival: {
            full_name: profile.full_name,
            phone: profile.phone,
            licence_last4: driver.licence_number.slice(-4),
            documents: ["Driving licence", "Vehicle RC"],
          },
        },
      ],
      { session },
    );
    await Payment.create(
      [{ booking_id: result._id, user_id: a._id, amount_minor: result.amount * 100 }],
      { session },
    );
    await notify(
      session,
      a._id,
      result._id,
      `${result.code}: ${result.status.toLowerCase()} at ${listing.title}. Carry your driving licence and vehicle RC.`,
    );
    await notify(
      session,
      listing.owner_id,
      result._id,
      `New ${result.status.toLowerCase()} booking ${result.code} at ${listing.title}. Carry your driving licence and vehicle RC.`,
    );
  });
  return json(result);
}
export async function changeBooking(req, id) {
  const a = requireUser(req),
    { status } = z
      .object({ status: z.enum(["Cancelled", "Confirmed", "Declined", "Completed"]) })
      .strict()
      .parse(req.body);
  let result;
  await mongoose.connection.transaction(async (session) => {
    const initial = await Booking.findById(id).session(session);
    if (!initial) fail(404, "Booking not found");
    const listing = await Listing.findOneAndUpdate(
      { _id: initial.listing_id },
      { $inc: { revision: 1 } },
      { new: true, session },
    );
    const b = await Booking.findById(id).session(session);
    const host = listing.owner_id === a._id,
      admin = a.account_type === "admin",
      driver = b.user_id === a._id;
    if (status === "Cancelled") {
      if (!driver && !admin) fail(403, "Cannot cancel this booking");
      if (!activeStatuses.includes(b.status) || +b.starts_at <= Date.now())
        fail(409, "Only upcoming active reservations can be cancelled");
    } else {
      if (!host && !admin) fail(403, "Booking belongs to another owner");
      if (status === "Completed") {
        if (b.status !== "Confirmed" || +b.ends_at > Date.now())
          fail(409, "A confirmed stay can be completed after its end time");
      } else if (b.status !== "Pending" || +b.starts_at <= Date.now())
        fail(409, "Only upcoming pending requests can be reviewed");
    }
    b.status = status;
    await b.save({ session });
    await notify(session, b.user_id, b._id, `${b.code}: ${status.toLowerCase()}.`);
    await notify(session, listing.owner_id, b._id, `${b.code}: ${status.toLowerCase()}.`);
    result = b;
  });
  return json(result);
}
export async function settleElapsedBookings({ limit = 500, deadline = Infinity } = {}) {
  const now = new Date();
  const candidates = await Booking.find({
    $or: [
      { status: "Confirmed", ends_at: { $lte: now } },
      { status: "Pending", starts_at: { $lte: now } },
    ],
  })
    .select("_id listing_id")
    .limit(limit);
  for (const candidate of candidates) {
    if (Date.now() >= deadline) break;
    await mongoose.connection.transaction(async (session) => {
      const l = await Listing.findOneAndUpdate(
        { _id: candidate.listing_id },
        { $inc: { revision: 1 } },
        { new: true, session },
      );
      const b = await Booking.findById(candidate._id).session(session);
      if (!b || !l) return;
      const next =
        b.status === "Confirmed" && b.ends_at <= now
          ? "Completed"
          : b.status === "Pending" && b.starts_at <= now
            ? "Declined"
            : null;
      if (!next) return;
      b.status = next;
      await b.save({ session });
      const message = `${b.code}: ${next === "Completed" ? "reservation time completed" : "request expired before owner approval"}.`;
      await notify(session, b.user_id, b._id, message);
      await notify(session, l.owner_id, b._id, message);
    });
  }
}
