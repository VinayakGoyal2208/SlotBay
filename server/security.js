import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
  createCipheriv,
  createDecipheriv,
  createHmac,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);
export const fail = (status, message) => {
  const e = new Error(message);
  e.status = status;
  throw e;
};
export const sha = (s) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export async function hashPassword(value) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(value, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(value, stored) {
  const [kind, salt, hex] = (stored || "").split(":");
  if (kind !== "scrypt" || !salt || !hex) return false;
  const actual = await scrypt(value, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 });
  const expected = Buffer.from(hex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const encryptionKey = () => {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!/^[a-f0-9]{64}$/i.test(key || ""))
    throw new Error("Set DATA_ENCRYPTION_KEY to 32 random bytes encoded as hex");
  return Buffer.from(key, "hex");
};
export function encrypt(value) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const bytes = Buffer.concat([
    cipher.update(Buffer.isBuffer(value) ? value : Buffer.from(value)),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), bytes].map((v) => v.toString("base64")).join(".");
}
export function decrypt(value, binary = false) {
  const [iv, tag, data] = value.split(".").map((v) => Buffer.from(v, "base64"));
  const cipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAuthTag(tag);
  const bytes = Buffer.concat([cipher.update(data), cipher.final()]);
  return binary ? bytes : bytes.toString();
}
export const signFile = (id, expires) =>
  createHmac("sha256", encryptionKey()).update(`${id}:${expires}`).digest("hex");
export const requireUser = (req) => req.auth || fail(401, "Sign in required");
export const requireAdmin = (req) =>
  requireUser(req).account_type === "admin" || fail(403, "Administrator access required");
export const auditAction = async (session, actor, action, resource) => {
  const { Audit } = await import("./models.js");
  await Audit.create([{ actor_id: actor._id, action, resource_id: resource }], { session });
};
