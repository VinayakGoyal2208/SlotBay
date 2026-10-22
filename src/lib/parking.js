import { SLOT_IMAGES } from "@/lib/slot-images";
import parkingOffice from "@/assets/parking-office.webp";
export function toSlot(r, image, images = []) {
  return {
    hostId: r.host_id,
    id: r.id,
    title: r.title,
    area: r.area,
    address: r.address,
    landmark: r.landmark,
    distance: r.distance,
    vehicles: r.vehicles,
    size: r.size,
    hourly: r.hourly,
    daily: r.daily,
    monthly: r.monthly,
    total: r.total,
    available: r.total,
    window: r.open_window,
    amenities: r.amenities,
    verified: r.verified,
    autoApprove: true,
    rules: r.rental_rules ?? "",
    owner: r.owner_name,
    lat: r.lat,
    lng: r.lng,
    image: image ?? null,
    imageKey: r.image_key,
    images,
  };
}
export const slotImage = (s) =>
  s.image ?? (s.imageKey ? SLOT_IMAGES[s.imageKey] : undefined) ?? parkingOffice;
export function priceFor(s, hours) {
  return Math.min(hours * s.hourly, Math.ceil(hours / 24) * s.daily, s.monthly);
}
export const vehicleLabel = (v) => (v === "2W" ? "2-wheeler" : "4-wheeler");
