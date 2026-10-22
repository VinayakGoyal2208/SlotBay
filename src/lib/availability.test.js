import { describe, test, expect } from "vitest";
import { availabilitySchema, distanceKm, overlaps } from "./availability.js";
import { listingSchema } from "./validation.js";
describe("reservation rules", () => {
  test("supports one-hour through one-month stays", () => {
    expect(
      availabilitySchema.safeParse({ date: "2026-10-13", start: "09:00", hours: 1 }).success,
    ).toBe(true);
    expect(
      availabilitySchema.safeParse({ date: "2026-10-13", start: "09:00", hours: 720 }).success,
    ).toBe(true);
    expect(
      availabilitySchema.safeParse({ date: "2026-10-13", start: "09:00", hours: 721 }).success,
    ).toBe(false);
  });
  test("invalid time cannot reach availability requests", () => {
    expect(
      availabilitySchema.safeParse({ date: "2026-10-13", start: "25:00", hours: 1 }).success,
    ).toBe(false);
  });
  test("adjacent stays do not conflict; overlapping stays do", () => {
    expect(overlaps(9, 10, 10, 11)).toBe(false);
    expect(overlaps(9, 11, 10, 12)).toBe(true);
  });
  test("nearby distance distinguishes Bengaluru from distant locations", () => {
    expect(distanceKm({ lat: 12.9716, lng: 77.5946 }, { lat: 12.9716, lng: 77.5946 })).toBe(0);
    expect(distanceKm({ lat: 12.9716, lng: 77.5946 }, { lat: 13.1, lng: 77.6 })).toBeGreaterThan(
      10,
    );
  });
  test("listing rates must rise hourly to daily to monthly", () => {
    const row = {
      title: "Parking",
      area: "Metro",
      address: "123 Station Road",
      landmark: "",
      size: "",
      open_window: "24 × 7",
      hourly: 40,
      daily: 240,
      monthly: 4000,
      total: 2,
      lat: 12.97,
      lng: 77.59,
      opens_at: "00:00",
      closes_at: "00:00",
      rental_rules: "",
      vehicles: ["4W"],
    };
    expect(listingSchema.safeParse(row).success).toBe(true);
    expect(listingSchema.safeParse({ ...row, daily: 20 }).success).toBe(false);
  });
});
