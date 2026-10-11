import { describe, expect, it } from "vitest";
import { approximateCenter, approximateCircle, placePricePins } from "./geo";

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

describe("placePricePins", () => {
  const downtown = { lat: 44.0582, lng: -121.3153 };

  it("spreads pins that share a downtown coordinate", () => {
    const placed = placePricePins([
      { id: "a", ...downtown },
      { id: "b", ...downtown },
      { id: "c", lat: downtown.lat + 0.0004, lng: downtown.lng },
    ]);
    expect(placed).toHaveLength(3);
    expect(placed.every((pin) => !pin.clustered)).toBe(true);
    const offsets = placed.map((pin) => `${pin.offsetX},${pin.offsetY}`);
    expect(new Set(offsets).size).toBe(3);
  });

  it("leaves distant pins where they are", () => {
    const placed = placePricePins([
      { id: "west", lat: 44.04, lng: -121.4 },
      { id: "east", lat: 44.1, lng: -121.2 },
    ]);
    expect(placed.map((pin) => [pin.offsetX, pin.offsetY])).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  it("clusters a tight group and spreads it again when expanded", () => {
    const points = Array.from({ length: 6 }, (_, index) => ({
      id: `home-${index}`,
      lat: downtown.lat,
      lng: downtown.lng,
    }));
    const clustered = placePricePins(points);
    expect(clustered).toHaveLength(1);
    expect(clustered[0]?.clustered).toBe(true);
    expect(clustered[0]?.items).toHaveLength(6);
    const spread = placePricePins(points, { expandedKey: clustered[0]?.key });
    expect(spread).toHaveLength(6);
    expect(spread.every((pin) => !pin.clustered)).toBe(true);
  });
});
