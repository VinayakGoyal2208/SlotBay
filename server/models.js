import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
const { Schema } = mongoose;
const base = {
  _id: { type: String, default: () => randomUUID() },
  created_at: { type: Date, default: Date.now },
};
function model(name, collection, fields, indexes = []) {
  const schema = new Schema(
    { ...base, ...fields },
    {
      collection,
      strict: "throw",
      versionKey: false,
      timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    },
  );
  for (const [keys, opts] of indexes) schema.index(keys, opts);
  return mongoose.model(name, schema);
}
export const Auth = model("Auth", "auth", {
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true, select: false },
  account_type: { type: String, enum: ["user", "owner", "admin"], required: true },
  suspended: { type: Boolean, default: false },
  version: { type: Number, default: 0 },
});
export const IdentityClaim = model("IdentityClaim", "identity_claims", {
  user_id: { type: String, index: true },
  kind: String,
});
export const ChangeRequest = model("ChangeRequest", "change_requests", {
  user_id: { type: String, index: true },
  category: String,
  message: String,
  proposed: Schema.Types.Mixed,
  attachments: [String],
  status: { type: String, enum: ["Open", "Approved", "Rejected"], default: "Open" },
  admin_note: String,
  resolved_at: Date,
  resolved_by: String,
});
const profileFields = {
  locked_at: { type: Date, default: Date.now },
  full_name: String,
  phone: String,
  email: String,
  account_type: String,
  suspended: { type: Boolean, default: false },
};
export const User = model("User", "users", profileFields);
export const Owner = model("Owner", "owners", profileFields);
export const Admin = model("Admin", "admins", profileFields);
export const profileModel = (type) => ({ user: User, owner: Owner, admin: Admin })[type];
export const Session = model(
  "Session",
  "auth_sessions",
  {
    token_hash: { type: String, unique: true },
    user_id: { type: String, index: true },
    expires_at: Date,
  },
  [[{ expires_at: 1 }, { expireAfterSeconds: 0 }]],
);
// Persist approval mail with the review transaction so a restart cannot lose it.
export const EmailJob = model(
  "EmailJob",
  "email_jobs",
  {
    user_id: { type: String, required: true },
    kind: { type: String, enum: ["owner-approved"], required: true },
    status: { type: String, enum: ["pending", "sent", "cancelled"], default: "pending" },
    attempts: { type: Number, default: 0 },
    next_attempt_at: { type: Date, default: Date.now },
    lease_until: { type: Date, default: () => new Date(0) },
    sent_at: Date,
  },
  [[{ status: 1, next_attempt_at: 1 }, {}]],
);
export const OwnerApplication = model("OwnerApplication", "owner_applications", {
  user_id: { type: String, unique: true },
  id_type: String,
  id_number: String,
  property_doc_type: String,
  place_address: String,
  account_holder: String,
  account_number: String,
  ifsc: String,
  id_doc_path: String,
  property_doc_path: String,
  photo_paths: [String],
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    index: true,
  },
  reviewed_at: Date,
  locked_at: Date,
  admin_note: String,
  submitted_at: { type: Date, default: Date.now },
});
export const Vehicle = model("Vehicle", "vehicles", {
  user_id: { type: String, unique: true },
  vehicle_type: { type: String, enum: ["2W", "4W"] },
  plate: String,
  locked_at: Date,
  reviewed_at: Date,
  rc_path: String,
  licence_number: String,
  licence_path: String,
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  admin_note: String,
  updated_at: { type: Date, default: Date.now },
});
export const Location = model(
  "Location",
  "locations",
  {
    listing_id: { type: String, unique: true },
    city: String,
    area: String,
    address: String,
    point: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] },
  },
  [
    [{ point: "2dsphere" }, {}],
    [{ city: 1, area: 1 }, {}],
  ],
);
export const Listing = model(
  "Listing",
  "listings",
  {
    owner_id: { type: String, index: true },
    owner_name: String,
    title: String,
    city: { type: String, default: "Bengaluru" },
    area: String,
    address: String,
    landmark: String,
    distance: { type: String, default: "Nearby" },
    vehicles: [String],
    size: String,
    hourly: Number,
    daily: Number,
    monthly: Number,
    total: Number,
    open_window: String,
    opens_at: String,
    closes_at: String,
    amenities: [String],
    rental_rules: String,
    verified: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    auto_approve: { type: Boolean, default: true },
    lat: Number,
    lng: Number,
    point: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: [Number] },
    image_key: { type: String, default: null },
    photo_url: String,
    photo_paths: [String],
    revision: { type: Number, default: 0 },
  },
  [
    [{ verified: 1, archived: 1, city: 1, vehicles: 1 }, {}],
    [{ point: "2dsphere" }, {}],
    [{ title: "text", area: "text", address: "text", landmark: "text", city: "text" }, {}],
  ],
);
export const Booking = model(
  "Booking",
  "bookings",
  {
    user_id: { type: String, index: true },
    listing_id: { type: String, index: true },
    code: { type: String, unique: true },
    booking_date: String,
    start_time: String,
    hours: Number,
    starts_at: Date,
    ends_at: Date,
    vehicle: String,
    plate: String,
    amount: Number,
    arrival: { full_name: String, phone: String, licence_last4: String, documents: [String] },
    currency: { type: String, default: "INR" },
    price_snapshot: { hourly: Number, daily: Number, monthly: Number },
    status: { type: String, enum: ["Pending", "Confirmed", "Declined", "Cancelled", "Completed"] },
    idempotency_key: String,
  },
  [
    [{ listing_id: 1, status: 1, starts_at: 1, ends_at: 1 }, {}],
    [{ user_id: 1, idempotency_key: 1 }, { unique: true }],
  ],
);
export const Block = model("Block", "listing_blocks", {
  listing_id: { type: String, index: true },
  block_date: String,
  starts_at: String,
  ends_at: String,
});
export const Notification = model("Notification", "notifications", {
  user_id: { type: String, index: true },
  booking_id: String,
  message: String,
  read_at: { type: Date, default: null },
});
export const Dispute = model("Dispute", "disputes", {
  user_id: { type: String, index: true },
  booking_id: String,
  message: String,
  status: { type: String, enum: ["Open", "Resolved"], default: "Open" },
});
export const Upload = model(
  "Upload",
  "uploads",
  {
    user_id: String,
    bucket: String,
    path: String,
    mime: String,
    data: { type: String, select: false },
    size: Number,
  },
  [[{ bucket: 1, path: 1 }, { unique: true }]],
);
export const Payment = model("Payment", "payments", {
  booking_id: { type: String, unique: true },
  user_id: String,
  amount_minor: Number,
  currency: { type: String, default: "INR" },
  status: {
    type: String,
    enum: ["not_collected", "pending", "paid", "refunded"],
    default: "not_collected",
  },
  provider: String,
  provider_reference: String,
});
export const Guideline = model("Guideline", "pricing_guidelines", {
  city: { type: String, unique: true },
  hourly_min: Number,
  hourly_max: Number,
  note: String,
  updated_by: String,
});
export const Audit = model("Audit", "audit_events", {
  actor_id: String,
  action: String,
  resource_id: String,
});
export function json(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : { ...doc };
  o.id = o._id;
  delete o._id;
  delete o.password_hash;
  delete o.version;
  delete o.revision;
  delete o.point;
  return o;
}
