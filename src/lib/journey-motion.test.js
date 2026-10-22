import { describe, expect, test } from "vitest";
import { journeyMotion } from "./journey-motion";

describe("scroll journey continuity", () => {
  test("car visibly travels while features change", () => {
    expect(journeyMotion(0.375).x - journeyMotion(0).x).toBeGreaterThan(25);
    expect(journeyMotion(0.9).y - journeyMotion(0).y).toBeGreaterThan(8);
  });
  test("every boundary remains continuous", () => {
    for (const p of [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.85, 0.97]) {
      const before = journeyMotion(p - 0.00001),
        after = journeyMotion(p + 0.00001);
      expect(Math.abs(after.x - before.x)).toBeLessThan(0.01);
      expect(Math.abs(after.y - before.y)).toBeLessThan(0.01);
      expect(Math.abs(after.scale - before.scale)).toBeLessThan(0.01);
    }
  });
  test("car stops in the final bay and reverses along exactly the same path", () => {
    expect(journeyMotion(0.97).x).toBe(73);
    expect(journeyMotion(1).x).toBe(73);
    expect(journeyMotion(1).y).toBe(23);
    expect(journeyMotion(1).parked).toBe(true);
    const forward = Array.from({ length: 21 }, (_, i) => journeyMotion(i / 20));
    const reverse = Array.from({ length: 21 }, (_, i) => journeyMotion((20 - i) / 20)).reverse();
    expect(reverse).toEqual(forward);
  });
  test("scenery travels with the drive and the car turns into the garage", () => {
    expect(journeyMotion(0.625).travel - journeyMotion(0.125).travel).toBeGreaterThan(80);
    expect(journeyMotion(0.75).turn).toBe(0);
    expect(journeyMotion(0.85).turn).toBe(1);
    expect(journeyMotion(0.85).garage).toBe(1);
    expect(journeyMotion(0.85).portal).toBe(1);
    expect(journeyMotion(0.97).travel).toBe(journeyMotion(1).travel);
  });
});
