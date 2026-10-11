/**
 * Launch markets. Mirrors the `locations` table Backend owns:
 * id, slug, name, region, state, country, active, sort.
 * Seeded with Bend and Deschutes County. UI reads this module
 * so a city name is never hard-coded in a component.
 */
export type Location = {
  id: string;
  slug: string;
  name: string;
  region: string;
  state: string;
  country: string;
  active: boolean;
  sort: number;
};

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
  },
  {
    id: "c3a1e0b2-4d5f-4a6b-8c7d-111111111102",
    slug: "deschutes-county",
    name: "Deschutes County",
    region: "Central Oregon",
    state: "OR",
    country: "US",
    active: true,
    sort: 2,
  },
];

const STATE_NAMES: Record<string, string> = {
  OR: "Oregon",
};

export function activeLocations(): Location[] {
  return locations
    .filter((location) => location.active)
    .sort((a, b) => a.sort - b.sort);
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
export function locationShort(location: Location): string {
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
