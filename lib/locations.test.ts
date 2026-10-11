import { describe, expect, it } from "vitest";
import {
  activeLocations,
  launchKicker,
  locationPlace,
  locationShort,
  locations,
  primaryLocation,
} from "./locations";

const locationKeys = [
  "id",
  "slug",
  "name",
  "region",
  "state",
  "country",
  "active",
  "sort",
] as const;

describe("locations", () => {
  it("mirrors the locations table and seeds the first two markets", () => {
    expect(locations).toHaveLength(2);
    for (const location of locations) {
      expect(Object.keys(location).sort()).toEqual([...locationKeys].sort());
      expect(location.state).toBe("OR");
      expect(location.country).toBe("US");
      expect(location.active).toBe(true);
    }

    const [first, second] = activeLocations();
    expect(first?.slug).toBe("bend");
    expect(first?.name).toBe("Bend");
    expect(first?.region).toBe("Deschutes County");
    expect(second?.slug).toBe("deschutes-county");
    expect(second?.name).toBe("Deschutes County");
  });

  it("builds display copy from the record instead of a fixed city", () => {
    const market = primaryLocation();
    expect(locationShort(market)).toBe("Bend, OR");
    expect(locationPlace(market)).toBe("Bend, Oregon");
    expect(launchKicker(market)).toBe("Now in Bend & Deschutes County");
  });
});
