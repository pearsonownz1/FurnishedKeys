/**
 * Launch markets. Mirrors the `locations` table:
 * id, slug, name, region, state, country, active, sort, sort_order, parent_id, lat, lng.
 * The Where dropdown reads sort_order from the database via loadWhereLocations.
 * This module is the fallback when that read is unavailable, and the source of
 * display copy so a city name is never hard-coded in a component.
 */
import type { Location } from "@/lib/db/types";

export type { Location };

const DESCHUTES = "c3a1e0b2-4d5f-4a6b-8c7d-111111111102";

export const locations: Location[] = [
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111101",
    slug: "bend",
    name: "Bend",
    region: "Deschutes County",
    state: "OR",
    country: "US",
    active: true,
    sort: 1,
    sort_order: 1,
    parent_id: DESCHUTES,
    lat: 44.058172,
    lng: -121.315308,
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111103",
    slug: "redmond",
    name: "Redmond",
    region: "Deschutes County",
    state: "OR",
    country: "US",
    active: true,
    sort: 2,
    sort_order: 2,
    parent_id: DESCHUTES,
    lat: 44.272621,
    lng: -121.173921,
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111104",
    slug: "prineville",
    name: "Prineville",
    region: "Crook County",
    state: "OR",
    country: "US",
    active: true,
    sort: 3,
    sort_order: 3,
    parent_id: null,
    lat: 44.299849,
    lng: -120.834481,
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111105",
    slug: "madras",
    name: "Madras",
    region: "Jefferson County",
    state: "OR",
    country: "US",
    active: true,
    sort: 4,
    sort_order: 4,
    parent_id: null,
    lat: 44.633452,
    lng: -121.129494,
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111106",
    slug: "la-pine",
    name: "La Pine",
    region: "Deschutes County",
    state: "OR",
    country: "US",
    active: true,
    sort: 5,
    sort_order: 5,
    parent_id: DESCHUTES,
    lat: 43.670398,
    lng: -121.503064,
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111107",
    slug: "sisters",
    name: "Sisters",
    region: "Deschutes County",
    state: "OR",
    country: "US",
    active: true,
    sort: 6,
    sort_order: 6,
    parent_id: DESCHUTES,
    lat: 44.290953,
    lng: -121.549171,
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111108",
    slug: "sunriver",
    name: "Sunriver",
    region: "Deschutes County",
    state: "OR",
    country: "US",
    active: true,
    sort: 7,
    sort_order: 7,
    parent_id: DESCHUTES,
    lat: 43.872349,
    lng: -121.438171,
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111109",
    slug: "terrebonne",
    name: "Terrebonne",
    region: "Deschutes County",
    state: "OR",
    country: "US",
    active: true,
    sort: 8,
    sort_order: 8,
    parent_id: DESCHUTES,
    lat: 44.353179,
    lng: -121.178128,
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111110",
    slug: "tumalo",
    name: "Tumalo",
    region: "Deschutes County",
    state: "OR",
    country: "US",
    active: true,
    sort: 9,
    sort_order: 9,
    parent_id: DESCHUTES,
    lat: 44.149557,
    lng: -121.331428,
  },
  {
    id: DESCHUTES,
    slug: "deschutes-county",
    name: "Deschutes County",
    region: "Central Oregon",
    state: "OR",
    country: "US",
    active: true,
    sort: 10,
    sort_order: 10,
    parent_id: null,
    lat: 43.915,
    lng: -121.3,
  },
];

const STATE_NAMES: Record<string, string> = {
  OR: "Oregon",
};

export function activeLocations(): Location[] {
  return locations
    .filter((location) => location.active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Cities an owner can pick. Drops any row that is another row's parent,
 * so the county option stays in search and off the listing wizard.
 * A city with no county row (parent_id null) still stays.
 */
export function cityLocations(rows: Location[] = locations): Location[] {
  const source = rows.filter((location) => location.active);
  const parentIds = new Set(
    source.flatMap((location) => (location.parent_id ? [location.parent_id] : [])),
  );
  return source
    .filter((location) => !parentIds.has(location.id))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function primaryLocation(): Location {
  const [first] = activeLocations();
  if (!first) {
    throw new Error("No active locations configured");
  }
  return first;
}

export function locationBySlug(slug: string): Location | undefined {
  return locations.find((location) => location.slug === slug);
}

export function locationById(id: string): Location | undefined {
  return locations.find((location) => location.id === id);
}

export function stateName(state: string): string {
  return STATE_NAMES[state] ?? state;
}

/** "Bend, OR" */
export function locationShort(location: { name: string; state: string }): string {
  return `${location.name}, ${location.state}`;
}

/** "Bend, Oregon" */
export function locationPlace(location: Location): string {
  return `${location.name}, ${stateName(location.state)}`;
}

/** "Now in Bend & Deschutes County" when the place sits in a named region. */
export function launchKicker(location: Location = primaryLocation()): string {
  if (location.region && location.region !== location.name) {
    return `Now in ${location.name} & ${location.region}`;
  }
  return `Now in ${location.name}`;
}
