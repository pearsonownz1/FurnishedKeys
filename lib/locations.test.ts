import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadCityLocationsFrom, type WhereLocation } from "./locations-load";
import {
  activeLocations,
  cityLocations,
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
  "sort_order",
  "parent_id",
  "lat",
  "lng",
] as const;

const dropdownOrder = [
  "bend",
  "redmond",
  "prineville",
  "madras",
  "la-pine",
  "sisters",
  "sunriver",
  "terrebonne",
  "tumalo",
  "deschutes-county",
] as const;

describe("locations", () => {
  it("orders the Where dropdown with Deschutes County last", () => {
    expect(locations).toHaveLength(dropdownOrder.length);
    for (const location of locations) {
      expect(Object.keys(location).sort()).toEqual([...locationKeys].sort());
      expect(location.state).toBe("OR");
      expect(location.country).toBe("US");
      expect(location.active).toBe(true);
      expect(location.lat).not.toBeNull();
      expect(location.lng).not.toBeNull();
    }

    const ordered = activeLocations();
    expect(ordered.map((location) => location.slug)).toEqual([...dropdownOrder]);
    expect(ordered.map((location) => location.sort_order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(ordered[0]?.name).toBe("Bend");
    expect(ordered[0]?.region).toBe("Deschutes County");
    expect(ordered.at(-1)?.slug).toBe("deschutes-county");
    expect(ordered.at(-1)?.region).toBe("Central Oregon");
    expect(ordered.at(-1)?.parent_id).toBeNull();
  });

  it("offers cities in the wizard and leaves the county row out", () => {
    const cities = cityLocations();
    expect(cities.map((location) => location.slug)).toEqual([
      "bend",
      "redmond",
      "prineville",
      "madras",
      "la-pine",
      "sisters",
      "sunriver",
      "terrebonne",
      "tumalo",
    ]);
    expect(cities.some((location) => location.slug === "deschutes-county")).toBe(false);
    const countyId = locations.find((location) => location.slug === "deschutes-county")?.id;
    expect(
      cities
        .filter((location) => location.region === "Deschutes County")
        .every((location) => location.parent_id === countyId),
    ).toBe(true);
    expect(cities.find((location) => location.slug === "prineville")?.parent_id).toBeNull();
    expect(cities.find((location) => location.slug === "madras")?.region).toBe("Jefferson County");
  });

  it("keeps Bend launch copy built from the primary row", () => {
    const market = primaryLocation();
    expect(locationShort(market)).toBe("Bend, OR");
    expect(locationPlace(market)).toBe("Bend, Oregon");
    expect(launchKicker(market)).toBe("Now in Bend & Deschutes County");
  });

  it("drops parent rows from a Where list", () => {
    const rows = activeLocations().map(
      (location): WhereLocation => ({
        id: location.id,
        slug: location.slug,
        name: location.name,
        region: location.region,
        state: location.state,
        country: location.country,
        sort_order: location.sort_order,
        parent_id: location.parent_id,
        lat: location.lat,
        lng: location.lng,
      }),
    );
    expect(loadCityLocationsFrom(rows).map((location) => location.slug)).not.toContain(
      "deschutes-county",
    );
    expect(loadCityLocationsFrom(rows)).toHaveLength(9);
  });

  it("loads the Where dropdown from locations ordered by sort_order", () => {
    const source = readFileSync(new URL("./locations-load.ts", import.meta.url), "utf8");
    expect(source).toContain('from("locations")');
    expect(source).toContain('.eq("active", true)');
    expect(source).toContain('.order("sort_order", { ascending: true })');
    expect(source).toContain("export async function loadWhereLocations()");
    expect(source).toContain("export async function loadCityLocations()");
  });
});
