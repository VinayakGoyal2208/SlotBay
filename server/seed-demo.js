import "dotenv/config";
import mongoose from "mongoose";
import { Auth, Owner, OwnerApplication, Listing, Location } from "./models.js";
import { hashPassword, encrypt, token } from "./security.js";
export async function seedDemo() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_DEMO_SEED !== "true" ||
    !mongoose.connection.name.endsWith("_demo")
  )
    throw new Error(
      "Demo seeding requires ALLOW_DEMO_SEED=true and a database name ending in _demo; never use production",
    );
  if (await Listing.exists({})) return;
  const a = await Auth.create({
    email: "demo-owner@example.invalid",
    password_hash: await hashPassword(token()),
    account_type: "owner",
  });
  await Owner.create({
    _id: a._id,
    email: a.email,
    full_name: "Demonstration Owner",
    phone: "",
    account_type: "owner",
  });
  await OwnerApplication.create({
    user_id: a._id,
    status: "approved",
    id_type: "pan",
    id_number: encrypt("DEMO ONLY"),
    account_number: encrypt("DEMO ONLY"),
    account_holder: "Demonstration Owner",
    place_address: "Fictitious demo data",
    photo_paths: [],
  });
  for (const [title, area, image_key, lat, lng] of [
    ["Metro courtyard", "Indiranagar", "metro-annex-12", 12.9784, 77.6408],
    ["Covered city parking", "MG Road", "greenline-07", 12.9755, 77.6068],
    ["Neighbourhood driveway", "Jayanagar", "hsr-villa", 12.925, 77.5938],
  ]) {
    const l = await Listing.create({
      owner_id: a._id,
      owner_name: "Demonstration Owner",
      title: `DEMO — ${title}`,
      city: "Bengaluru",
      area,
      address: `Fictitious demo space in ${area}, Bengaluru`,
      landmark: "Metro station",
      distance: "Demo location",
      vehicles: ["2W", "4W"],
      size: "2.5 × 5 m",
      hourly: 40,
      daily: 240,
      monthly: 4000,
      total: 5,
      open_window: "24 × 7",
      opens_at: "00:00",
      closes_at: "00:00",
      amenities: ["Covered", "Lighting"],
      rental_rules: "Demonstration only. This is not a real parking listing.",
      verified: true,
      auto_approve: true,
      lat,
      lng,
      point: { type: "Point", coordinates: [lng, lat] },
      image_key,
      photo_paths: [],
    });
    await Location.create({
      listing_id: l._id,
      city: l.city,
      area,
      address: l.address,
      point: l.point,
    });
  }
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/seed-demo.js")) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await seedDemo();
    console.log("Fictitious demo spaces created.");
  } finally {
    await mongoose.disconnect();
  }
}
