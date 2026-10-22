import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Auth, Session, Vehicle, profileModel } from "./models.js";
import { fail, sha, token, hashPassword, verifyPassword } from "./security.js";
import { claimIdentity } from "./identity.js";
import { nameRule, phoneRule, driverSchema } from "../src/lib/validation.js";
export const authRouter = Router();
const password = z.string().min(8).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/);
const email = z
  .string()
  .trim()
  .email()
  .max(255)
  .transform((v) => v.toLowerCase());
const cookie = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 86400000,
});
export async function loadAuth(req, _res, next) {
  try {
    if (req.cookies.slotbay_session) {
      const s = await Session.findOne({
        token_hash: sha(req.cookies.slotbay_session),
        expires_at: { $gt: new Date() },
      });
      if (s) {
        const a = await Auth.findById(s.user_id);
        if (a && !a.suspended) {
          req.auth = a;
          req.session = s;
        }
      }
    }
    next();
  } catch (e) {
    next(e);
  }
}
async function sessionFor(res, a) {
  const raw = token();
  await Session.create({
    token_hash: sha(raw),
    user_id: a._id,
    expires_at: new Date(Date.now() + 7 * 86400000),
  });
  res.cookie("slotbay_session", raw, cookie());
  return { user: { id: a._id, email: a.email } };
}
authRouter.get("/session", (req, res) =>
  res.json({ session: req.auth ? { user: { id: req.auth._id, email: req.auth.email } } : null }),
);
authRouter.post("/register", async (req, res) => {
  const v = z
    .object({
      email,
      password,
      full_name: nameRule,
      phone: phoneRule,
      account_type: z.enum(["user", "owner"]),
      vehicle: driverSchema.optional(),
    })
    .strict()
    .parse(req.body);
  if (v.email === (process.env.ADMIN_EMAIL || "admin@gmail.com").toLowerCase())
    fail(409, "This address is reserved");
  if (v.account_type === "user" && !v.vehicle)
    fail(400, "Vehicle and driving licence details are required");
  if (v.account_type === "owner" && v.vehicle)
    fail(400, "Use a driver account for vehicle registration");
  const password_hash = await hashPassword(v.password);
  let account;
  await mongoose.connection.transaction(async (session) => {
    [account] = await Auth.create(
      [{ email: v.email, password_hash, account_type: v.account_type }],
      { session },
    );
    await claimIdentity(account._id, "phone", v.phone, session);
    if (v.vehicle) {
      await claimIdentity(account._id, "plate", v.vehicle.plate, session);
      await claimIdentity(account._id, "licence_number", v.vehicle.licence_number, session);
      await Vehicle.create(
        [{ ...v.vehicle, user_id: account._id, status: "approved", locked_at: new Date() }],
        { session },
      );
    }
    await profileModel(v.account_type).create(
      [
        {
          _id: account._id,
          email: v.email,
          account_type: v.account_type,
          full_name: v.full_name,
          phone: v.phone,
        },
      ],
      { session },
    );
  });
  res.status(201).json({ session: await sessionFor(res, account) });
});
let dummyHash;
authRouter.post("/login", async (req, res) => {
  const v = z
    .object({ email, password: z.string().min(1).max(72) })
    .strict()
    .parse(req.body);
  const a = await Auth.findOne({ email: v.email }).select("+password_hash");
  dummyHash ||= await hashPassword(token());
  const ok = await verifyPassword(v.password, a?.password_hash || dummyHash);
  if (!ok || !a || a.suspended) fail(401, "Wrong email or password, or account unavailable");
  if (req.session) await Session.deleteOne({ _id: req.session._id });
  res.json({ session: await sessionFor(res, a) });
});
authRouter.post("/logout", async (req, res) => {
  if (req.session) await Session.deleteOne({ _id: req.session._id });
  res.clearCookie("slotbay_session", { ...cookie(), maxAge: undefined });
  res.json({ ok: true });
});
