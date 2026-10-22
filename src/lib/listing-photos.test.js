import { describe, test, expect } from "vitest";
import { galleryFits } from "./listing-photos.js";
describe("owner photo gallery", () => {
  test("allows five additional photos alongside the cover", () => {
    expect(galleryFits(0, 5)).toBe(true);
    expect(galleryFits(0, 6)).toBe(false);
  });
  test("existing photos count toward the gallery limit", () => {
    expect(galleryFits(3, 2)).toBe(true);
    expect(galleryFits(3, 3)).toBe(false);
  });
});
