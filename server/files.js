import express, { Router } from "express";
import { timingSafeEqual } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { Upload, Listing } from "./models.js";
import { fail, requireUser, encrypt, decrypt, signFile } from "./security.js";
import { MAX_UPLOAD_MB } from "../src/lib/validation.js";
export const filesRouter = Router();
const bucketOK = (b) => ["documents", "listing-photos"].includes(b);
export async function checkPaths(uid, bucket, paths, session) {
  for (const p of paths) {
    if (!p || !(await Upload.exists({ user_id: uid, bucket, path: p }).session(session || null)))
      fail(400, "Upload a file owned by this account first");
  }
}
export function fileUrl(file) {
  const expires = Date.now() + 10 * 60000;
  return `/api/v1/files/content/${file._id}?expires=${expires}&signature=${signFile(file._id, expires)}`;
}
export async function photoUrl(path, session) {
  if (!path) return null;
  const f = await Upload.findOne({ bucket: "listing-photos", path }).session(session || null);
  return f ? fileUrl(f) : null;
}
filesRouter.post(
  "/upload",
  express.raw({ type: () => true, limit: MAX_UPLOAD_MB * 1024 * 1024 }),
  async (req, res) => {
    const a = requireUser(req),
      bucket = String(req.query.bucket),
      path = String(req.query.path);
    if (
      !bucketOK(bucket) ||
      !path.startsWith(`${a._id}/`) ||
      !/^[a-zA-Z0-9/_.-]+$/.test(path) ||
      path.includes("..") ||
      path.length > 300
    )
      fail(400, "Invalid upload path");
    if (!Buffer.isBuffer(req.body) || req.body.length < 10 * 1024)
      fail(400, "Upload a clear file of at least 10 KB");
    const type = await fileTypeFromBuffer(req.body);
    const allowed =
      bucket === "documents"
        ? ["image/jpeg", "image/png", "image/webp", "application/pdf"]
        : ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(type?.mime)) fail(400, "Unsupported file content");
    const [{ bytes = 0 } = {}] = await Upload.aggregate([
      { $match: { user_id: a._id } },
      { $group: { _id: null, bytes: { $sum: "$size" } } },
    ]);
    if (bytes + req.body.length > 100 * 1024 * 1024)
      fail(413, "Account upload quota reached; contact support");
    await Upload.create({
      user_id: a._id,
      bucket,
      path,
      mime: type.mime,
      size: req.body.length,
      data: encrypt(req.body),
    });
    res.status(201).json({ path });
  },
);
filesRouter.get("/signed", async (req, res) => {
  const f = await Upload.findOne({
    bucket: String(req.query.bucket),
    path: String(req.query.path),
  });
  if (!f) fail(404, "File not found");
  let canRead = req.auth && (req.auth._id === f.user_id || req.auth.account_type === "admin");
  if (!canRead && f.bucket === "listing-photos")
    canRead = !!(await Listing.exists({
      verified: true,
      archived: false,
      $or: [{ photo_url: f.path }, { photo_paths: f.path }],
    }));
  if (!canRead) fail(403, "File access denied");
  res.json({ signedUrl: fileUrl(f) });
});
filesRouter.get("/content/:id", async (req, res) => {
  const expires = Number(req.query.expires),
    sig = String(req.query.signature || "");
  const expected = signFile(req.params.id, expires);
  if (
    !Number.isFinite(expires) ||
    expires < Date.now() ||
    expires > Date.now() + 11 * 60000 ||
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  )
    fail(403, "File link expired or invalid");
  const f = await Upload.findById(req.params.id).select("+data");
  if (!f) fail(404, "File not found");
  res.set({
    "Content-Type": f.mime,
    "Cache-Control": "private, no-store",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Content-Disposition": `inline; filename="document.${f.mime === "application/pdf" ? "pdf" : f.mime.split("/")[1]}"`,
  });
  res.send(decrypt(f.data, true));
});
