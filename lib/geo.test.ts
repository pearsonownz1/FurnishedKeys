import { describe, expect, it } from "vitest";
import { approximateCenter, approximateCircle } from "./geo";

describe("approximateCircle", () => {
  it("draws a ring around the rounded coordinate", () => {
    const ring = approximateCircle(-121.31, 44.06, 800, 8);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    const lats = ring.map((point) => point[1]);
    const lngs = ring.map((point) => point[0]);
    expect(Math.max(...lats)).toBeGreaterThan(44.06);
    expect(Math.min(...lats)).toBeLessThan(44.06);
    const span = Math.max(...lngs) - Math.min(...lngs);
    expect(span).toBeGreaterThan(0.005);
    expect(span).toBeLessThan(0.05);
  });
});

describe("approximateCenter", () => {
  it("averages the points it is given", () => {
    expect(
      approximateCenter([
        { lat: 44, lng: -121 },
        { lat: 46, lng: -123 },
      ]),
    ).toEqual({ lat: 45, lng: -122 });
    expect(approximateCenter([])).toBeNull();
  });
});
