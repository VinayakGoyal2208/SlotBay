import { z } from "zod";
// Verhoeff checksum — real Aadhaar numbers pass this check.
const D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
export function verhoeffValid(num) {
  let c = 0;
  num
    .split("")
    .reverse()
    .forEach((ch, i) => {
      const p = P[i % 8]?.[Number(ch)];
      c = p === undefined ? -1 : (D[c]?.[p] ?? -1);
    });
  return c === 0;
}
export const clean = (s) => s.replace(/[\s-]/g, "").toUpperCase();
/** Loose name match: every word of the shorter name must appear in the longer one. */
export function namesMatch(a, b) {
  const w = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((x) => x.length > 1);
  const [x, y] = [w(a), w(b)];
  if (!x.length || !y.length) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.every((p) => long.includes(p));
}
export const nameRule = z
  .string()
  .trim()
  .min(3, "Enter your full name")
  .max(100)
  .regex(/^[A-Za-z][A-Za-z .']+$/, "Use letters only");
export const phoneRule = z
  .string()
  .trim()
  .transform(clean)
  .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"));
export const emailRule = z.string().trim().email("Enter a valid email").max(255);
export const passwordRule = z
  .string()
  .min(8, "At least 8 characters")
  .max(72)
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/\d/, "Add a number");
export const signupSchema = z
  .object({
    full_name: nameRule,
    phone: phoneRule,
    email: emailRule,
    password: passwordRule,
    confirm: z.string(),
    account_type: z.enum(["user", "owner"]),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
export const plateRule = z
  .string()
  .transform(clean)
  .pipe(
    z
      .string()
      .regex(
        /^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{1,2})$/,
        "Invalid vehicle number (e.g. KA01AB1234)",
      ),
  );
export const licenceRule = z
  .string()
  .transform(clean)
  .pipe(z.string().regex(/^[A-Z]{2}\d{13}$/, "Invalid licence number (e.g. KA0120190001234)"));
export const driverSchema = z
  .object({ vehicle_type: z.enum(["2W", "4W"]), plate: plateRule, licence_number: licenceRule })
  .refine((d) => d.plate.slice(0, 2) !== "", { path: ["plate"], message: "Invalid plate" });
export const idNumberValid = (type, n) => {
  const v = clean(n);
  if (type === "aadhaar")
    return /^[2-9]\d{11}$/.test(v) && verhoeffValid(v)
      ? null
      : "Aadhaar must be 12 digits and pass the checksum";
  if (type === "pan")
    return /^[A-Z]{3}P[A-Z]\d{4}[A-Z]$/.test(v)
      ? null
      : "Individual PAN looks like ABCPE1234F (4th letter P)";
  if (type === "dl")
    return /^[A-Z]{2}\d{13}$/.test(v) ? null : "Licence looks like KA0120190001234";
  return "Choose an ID type";
};
export const ownerSchema = z
  .object({
    id_type: z.enum(["aadhaar", "pan", "dl"]),
    id_number: z.string().min(1, "Required"),
    property_doc_type: z.enum(["sale_deed", "rental_agreement", "electricity_bill"]),
    place_address: z.string().trim().min(10, "Enter the full address").max(300),
    account_holder: nameRule,
    account_number: z
      .string()
      .transform(clean)
      .pipe(z.string().regex(/^\d{9,18}$/, "Account number is 9–18 digits")),
    confirm_account: z.string().transform(clean),
    ifsc: z
      .string()
      .transform(clean)
      .pipe(z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "IFSC looks like HDFC0001234")),
  })
  .superRefine((d, ctx) => {
    const e = idNumberValid(d.id_type, d.id_number);
    if (e) ctx.addIssue({ code: "custom", path: ["id_number"], message: e });
    if (d.account_number !== d.confirm_account)
      ctx.addIssue({
        code: "custom",
        path: ["confirm_account"],
        message: "Account numbers do not match",
      });
  });
const requiredNumber = (number) =>
  z.string().trim().min(1, "Enter a number").or(z.number()).pipe(z.coerce.number().pipe(number));
export const listingSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    city: z.string().trim().min(2).max(80).default("Bengaluru"),
    area: z.string().trim().min(2).max(60),
    address: z.string().trim().min(10).max(300),
    landmark: z.string().trim().max(80),
    size: z.string().trim().max(30),
    open_window: z.string().trim().min(3).max(40),
    hourly: requiredNumber(z.number().int().min(5).max(1000)),
    daily: requiredNumber(z.number().int().min(10).max(10000)),
    monthly: requiredNumber(z.number().int().min(100).max(100000)),
    total: requiredNumber(z.number().int().min(1).max(500)),
    lat: requiredNumber(z.number().min(-90).max(90)),
    lng: requiredNumber(z.number().min(-180).max(180)),
    opens_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closes_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    rental_rules: z.string().trim().max(1000),
    vehicles: z.array(z.enum(["2W", "4W"])).min(1, "Pick at least one vehicle type"),
  })
  .refine((d) => d.daily >= d.hourly && d.monthly >= d.daily, {
    path: ["monthly"],
    message: "Prices must rise: hourly ≤ daily ≤ monthly",
  });
const IMG = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_MB = 4;
export function checkFile(f, opts) {
  if (!f) return `${opts.label} is required`;
  const ok = opts.pdf ? [...IMG, "application/pdf"] : IMG;
  if (!ok.includes(f.type))
    return `${opts.label} must be ${opts.pdf ? "JPG, PNG, WEBP or PDF" : "JPG, PNG or WEBP"}`;
  if (f.size > MAX_UPLOAD_MB * 1024 * 1024)
    return `${opts.label} must be at most ${MAX_UPLOAD_MB} MB`;
  if (f.size < 10 * 1024) return `${opts.label} looks too small or blurry — upload a clear file`;
  return null;
}
/** Ensures a photo is a real, reasonably sized image (not a tiny or blank file). */
export function checkImageDimensions(f) {
  return new Promise((res) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      res(img.width < 640 || img.height < 480 ? `${f.name}: photo must be at least 640×480` : null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      res(`${f.name}: not a readable image`);
    };
    img.src = url;
  });
}
export function fieldErrors(err) {
  const o = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    if (!o[k]) o[k] = i.message;
  }
  return o;
}
