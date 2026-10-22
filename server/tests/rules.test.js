import { describe, test, expect } from "vitest";
import { interval, priceFor, peakOccupancy, withinOpening, capacity } from "../rules.js";
const future = { date: "2030-01-10", start: "09:00", hours: 2 };
describe("server reservation invariants", () => {
  test("rejects nonexistent calendar dates and excessive duration", () => {
    expect(() => interval({ ...future, date: "2030-02-30" })).toThrow();
    expect(() => interval({ ...future, hours: 721 })).toThrow();
  });
  test("interprets booking time in India", () =>
    expect(interval(future).start.toISOString()).toBe("2030-01-10T03:30:00.000Z"));
  test("applies hourly/day/30-day caps to a full stay", () => {
    const rates = { hourly: 50, daily: 200, monthly: 3000 };
    expect(priceFor(rates, 1)).toBe(50);
    expect(priceFor(rates, 7)).toBe(200);
    expect(priceFor(rates, 25)).toBe(400);
    expect(priceFor(rates, 719)).toBe(3000);
    expect(priceFor(rates, 720)).toBe(3000);
  });
  test("adjacent reservations do not overcount peak capacity", () => {
    const bookings = [
      { starts_at: 10, ends_at: 20 },
      { starts_at: 20, ends_at: 30 },
    ];
    expect(peakOccupancy(bookings, 10, 30)).toBe(1);
    expect(peakOccupancy([...bookings, { starts_at: 15, ends_at: 25 }], 10, 30)).toBe(2);
  });
  test("opening hours handle overnight access and continuous multi-day stays", () => {
    const l = { opens_at: "22:00", closes_at: "06:00" };
    const night = interval({ ...future, start: "23:00", hours: 6 });
    expect(withinOpening(l, night.start, night.end)).toBe(true);
    const day = interval(future);
    expect(withinOpening(l, day.start, day.end)).toBe(false);
    const month = interval({ ...future, hours: 720 });
    expect(withinOpening(l, month.start, month.end)).toBe(false);
    expect(withinOpening({ opens_at: "00:00", closes_at: "00:00" }, month.start, month.end)).toBe(
      true,
    );
  });
  test("blocks, unpublished spaces and overlapping stays prevent reservations", () => {
    const l = { verified: true, archived: false, total: 2, opens_at: "00:00", closes_at: "00:00" };
    const t = interval(future);
    expect(capacity(l, [], [], t.start, t.end)).toBe(2);
    expect(
      capacity(
        l,
        [],
        [{ block_date: future.date, starts_at: "10:00", ends_at: "12:00" }],
        t.start,
        t.end,
      ),
    ).toBe(0);
    expect(capacity({ ...l, verified: false }, [], [], t.start, t.end)).toBe(0);
  });
});
