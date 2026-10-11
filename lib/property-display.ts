import type { PropertyType, PublicLandlord } from "@/lib/db/types";
import { amenityCatalog, amenityGroups } from "@/lib/listings/amenities";
import { goodForCatalog } from "@/lib/listings/good-for";

export function propertyTypeName(type: PropertyType): string {
  switch (type) {
    case "adu":
      return "ADU";
    case "apartment":
      return "Apartment";
    case "room":
      return "Room";
    case "house":
      return "House";
    case "other":
      return "Other";
  }
}

export function squareFeetFact(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return `${Math.round(value).toLocaleString("en-US")} sq ft`;
}

export function bedFact(bedrooms: number | null): string | null {
  if (bedrooms == null) return null;
  if (bedrooms === 0) return "Studio";
  return bedrooms === 1 ? "1 bed" : `${bedrooms} beds`;
}

export function bathFact(bathrooms: number | null): string | null {
  if (bathrooms == null) return null;
  const text = Number.isInteger(bathrooms) ? String(bathrooms) : String(bathrooms);
  return bathrooms === 1 ? "1 bath" : `${text} baths`;
}

export function propertyFactLine(parts: {
  type: string;
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  pets: string | null;
}): string {
  return [
    parts.type,
    squareFeetFact(parts.squareFeet),
    bedFact(parts.bedrooms),
    bathFact(parts.bathrooms),
    parts.pets,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}

/** Known catalog keys stay in their group. Anything else is listed without a group. */
export function groupedAmenities(values: string[]): { group: string; labels: string[] }[] {
  const groups: { group: string; labels: string[] }[] = amenityGroups.map((group) => ({
    group,
    labels: [],
  }));
  const extra: string[] = [];
  for (const value of values) {
    const item = amenityCatalog.find((entry) => entry.key === value);
    if (!item) {
      extra.push(value);
      continue;
    }
    groups.find((group) => group.group === item.group)?.labels.push(item.label);
  }
  const visible = groups.filter((group) => group.labels.length > 0);
  if (extra.length > 0) visible.push({ group: "", labels: extra });
  return visible;
}

export function goodForTags(keys: string[]): string[] {
  return keys.flatMap((key) => {
    const item = goodForCatalog.find((entry) => entry.key === key);
    return item ? [item.label] : [];
  });
}

function utcDay(iso: string): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function relativeDay(iso: string, now: Date): string | null {
  const target = utcDay(iso);
  const current = utcDay(now.toISOString());
  if (target == null || current == null) return null;
  const diff = Math.round((current - target) / 86_400_000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

export function calendarUpdatedLabel(iso: string | null, now = new Date()): string | null {
  if (!iso) return null;
  const relative = relativeDay(iso, now);
  if (!relative) return null;
  return `Calendar updated ${relative}`;
}

export function memberSinceLabel(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
  return `On Furnished Keys since ${month} ${date.getUTCFullYear()}`;
}

export function landlordCard(
  row: PublicLandlord | null | undefined,
): { name: string; since: string } | null {
  const first = row?.first_name?.trim();
  if (!row || !first || !row.member_since) return null;
  const since = memberSinceLabel(row.member_since);
  if (!since) return null;
  const name = row.last_initial ? `${first} ${row.last_initial}.` : first;
  return { name, since };
}

export type TrustCell =
  | { id: "calendar"; text: string }
  | { id: "landlord"; name: string; since: string };

/** Two cells at most: calendar freshness, then the landlord card. No reply-time cell. */
export function trustCells(input: {
  calendarUpdatedAt: string | null;
  landlord: PublicLandlord | null;
  now?: Date;
}): TrustCell[] {
  const cells: TrustCell[] = [];
  const calendar = calendarUpdatedLabel(input.calendarUpdatedAt, input.now);
  if (calendar) cells.push({ id: "calendar", text: calendar });
  const card = landlordCard(input.landlord);
  if (card) cells.push({ id: "landlord", name: card.name, since: card.since });
  return cells;
}
