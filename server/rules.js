import { z } from "zod";
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return Number.isFinite(+d) && d.toISOString().slice(0, 10) === s;
  }, "Invalid calendar date");
export const intervalSchema = z.object({
  date,
  start: time,
  hours: z.coerce.number().int().min(1).max(720),
});
export function interval(input) {
  const v = intervalSchema.parse(input);
  const start = new Date(`${v.date}T${v.start}:00+05:30`);
  return { ...v, start, end: new Date(+start + v.hours * 3600000) };
}
export const overlap = (a, b, c, d) => +a < +d && +c < +b;
export function priceFor(s, hours) {
  if (hours === 720) return s.monthly;
  return Math.min(hours * s.hourly, Math.ceil(hours / 24) * s.daily, s.monthly);
}
// Maximum simultaneous occupancy, not the number of all bookings that touch a stay.
export function peakOccupancy(bookings, start, end) {
  const events = [];
  for (const b of bookings)
    if (overlap(start, end, b.starts_at, b.ends_at)) {
      events.push(
        [Math.max(+start, +new Date(b.starts_at)), 1],
        [Math.min(+end, +new Date(b.ends_at)), -1],
      );
    }
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let count = 0,
    peak = 0;
  for (const [, delta] of events) {
    count += delta;
    peak = Math.max(count, peak);
  }
  return peak;
}
export function withinOpening(listing, start, end) {
  if (listing.opens_at === listing.closes_at) return true;
  const minutes = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
  const open = minutes(listing.opens_at),
    close = minutes(listing.closes_at);
  const localStart = +start + 330 * 60000;
  const midnight = Math.floor(localStart / 86400000) * 86400000 - 330 * 60000;
  // A continuously parked vehicle must fit entirely inside a single opening window.
  return [-1, 0].some((day) => {
    const a = midnight + day * 86400000 + open * 60000;
    const b = midnight + day * 86400000 + close * 60000 + (close <= open ? 86400000 : 0);
    return +start >= a && +end <= b;
  });
}
export function blocked(blocks, start, end) {
  return blocks.some((b) => {
    const a = new Date(`${b.block_date}T${b.starts_at || "00:00"}:00+05:30`);
    const z = b.ends_at
      ? new Date(`${b.block_date}T${b.ends_at}:00+05:30`)
      : new Date(+a + 86400000);
    return overlap(start, end, a, z);
  });
}
export function capacity(listing, bookings, blocks, start, end) {
  if (
    !listing.verified ||
    listing.archived ||
    +start < Date.now() ||
    !withinOpening(listing, start, end) ||
    blocked(blocks, start, end)
  )
    return 0;
  return Math.max(0, listing.total - peakOccupancy(bookings, start, end));
}
export const listingSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    city: z.string().trim().min(2).max(80).default("Bengaluru"),
    area: z.string().trim().min(2).max(60),
    address: z.string().trim().min(10).max(300),
    landmark: z.string().trim().max(80),
    size: z.string().trim().max(30),
    hourly: z.number().int().min(5).max(1000),
    daily: z.number().int().min(10).max(10000),
    monthly: z.number().int().min(100).max(100000),
    total: z.number().int().min(1).max(500),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    opens_at: time,
    closes_at: time,
    rental_rules: z.string().max(1000),
    vehicles: z
      .array(z.enum(["2W", "4W"]))
      .min(1)
      .max(2),
    amenities: z.array(z.string().trim().max(80)).max(10),
    photo_url: z.string().min(1).max(300),
    photo_paths: z.array(z.string().max(300)).max(5),
  })
  .refine(
    (v) => v.hourly <= v.daily && v.daily <= v.monthly,
    "Hourly, daily and monthly rates must rise",
  );
