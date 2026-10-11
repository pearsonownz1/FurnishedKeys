import { locationBySlug, primaryLocation } from "@/lib/locations";

/** "For owners in Bend & Deschutes County" from the location table. */
export function ownersKicker(): string {
  const place = primaryLocation();
  return `For owners in ${place.name} & ${place.region}`;
}

/** Wider market name used in the owners hero, from the location table. */
export function ownersRegionName(): string {
  return locationBySlug("deschutes-county")?.region ?? primaryLocation().region;
}
