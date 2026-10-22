import "dotenv/config";
import mongoose from "mongoose";
import { Auth, Admin } from "./models.js";
import { hashPassword } from "./security.js";
export async function seedAdmin(email, password) {
  if (!email || !password || password.length < 8 || password.length > 72)
    throw new Error("Provide ADMIN_EMAIL and ADMIN_PASSWORD (8–72 characters) privately");
  email = email.toLowerCase().trim();
  const existing = await Auth.findOne({ email });
  if (existing) {
    if (existing.account_type !== "admin")
      throw new Error(
        "Address already belongs to a non-admin account; refusing privilege escalation",
      );
    console.log("Admin already exists. Seed does not overwrite credentials.");
    return existing;
  }
  const password_hash = await hashPassword(password);
  let a;
  await mongoose.connection.transaction(async (session) => {
    [a] = await Auth.create([{ email, password_hash, account_type: "admin" }], { session });
    await Admin.create(
      [{ _id: a._id, email, account_type: "admin", full_name: "SlotBay Administrator", phone: "" }],
      { session },
    );
  });
  return a;
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/seed-admin.js")) {
  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
    await mongoose.connect(process.env.MONGO_URI);
    await Auth.init();
    await Admin.init();
    await seedAdmin(process.env.ADMIN_EMAIL || "admin@gmail.com", process.env.ADMIN_PASSWORD);
    console.log("Admin seed complete. Remove ADMIN_PASSWORD from the runtime environment.");
  } finally {
    await mongoose.disconnect();
  }
}
