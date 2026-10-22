import { createHmac } from "node:crypto";
import { IdentityClaim, User, Owner, Admin, Vehicle, OwnerApplication } from "./models.js";
import { fail, decrypt } from "./security.js";
import { clean } from "../src/lib/validation.js";

// Unique claims serialize concurrent signups and admin changes without exposing IDs.
export async function claimIdentity(userId, kind, raw, session) {
  const value = clean(raw);
  if (kind === "phone") {
    for (const model of [User, Owner, Admin])
      if (await model.exists({ _id: { $ne: userId }, phone: value }).session(session))
        fail(409, "This mobile number is already linked to an account");
  } else if (["plate", "licence_number"].includes(kind)) {
    if (await Vehicle.exists({ user_id: { $ne: userId }, [kind]: value }).session(session))
      fail(409, "This vehicle or driving licence is already linked to another account");
  } else if (kind.startsWith("owner_id:")) {
    const rows = await OwnerApplication.find({
      user_id: { $ne: userId },
      id_type: kind.slice(9),
    }).session(session);
    if (rows.some((row) => clean(decrypt(row.id_number)) === value))
      fail(409, "This identity is already linked to another account");
  }
  const key = createHmac("sha256", Buffer.from(process.env.DATA_ENCRYPTION_KEY, "hex"))
    .update(`${kind}:${value}`)
    .digest("hex");
  const existing = await IdentityClaim.findById(key).session(session);
  if (existing && existing.user_id !== userId)
    fail(409, "These details are already linked to another account. Contact the administrator.");
  if (!existing) await IdentityClaim.create([{ _id: key, user_id: userId, kind }], { session });
  // Historic claims remain reserved: changing a phone cannot detach a vehicle's identity.
}
