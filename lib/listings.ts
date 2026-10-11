import { cache } from "react";
import type {
  AvailabilityWindow,
  FeeKind,
  ListingFee,
  ListingManagement,
  ListingPhoto,
  ListingPublic,
  Location,
  PropertyType,
} from "@/lib/db/types";
import { formatCents } from "@/lib/money";
import type { ListingQuery } from "@/lib/search";
import { createPublicClient } from "@/lib/supabase/public";

/**
 * Catalog reads from the live tables (`listings_public`, `listing_fees`,
 * `listing_photos`, `availability_windows`, `locations`).
 * Public reads never include `address_private`.
 */

type CatalogText = "title" | "slug";
type CatalogNumber =
  | "bedrooms"
  | "bathrooms"
  | "max_occupants"
  | "monthly_rent_cents";

/** Approved catalog row after null stub fields are coerced. Public RLS already hides unpaid listings. */
export type PublicListing = Omit<ListingPublic, CatalogText | CatalogNumber> & {
  title: string;
  slug: string;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  monthly_rent_cents: number;
  location: Location;
  fees: ListingFee[];
  photos: ListingPhoto[];
  availability_windows: AvailabilityWindow[];
};

const FEE_ORDER: FeeKind[] = [
  "utilities",
  "deposit",
  "cleaning",
  "pet",
  "other",
];

function asNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeListing(
  row: ListingPublic,
): Omit<PublicListing, "location" | "fees" | "photos" | "availability_windows"> {
  return {
    ...row,
    title: row.title ?? "",
    slug: row.slug ?? "",
    bedrooms: asNumber(row.bedrooms) ?? 0,
    bathrooms: asNumber(row.bathrooms) ?? 0,
    max_occupants: asNumber(row.max_occupants) ?? 1,
    monthly_rent_cents: asNumber(row.monthly_rent_cents) ?? 0,
    min_stay_months: asNumber(row.min_stay_months) ?? 1,
    max_stay_months:
      row.max_stay_months === null ? null : asNumber(row.max_stay_months),
    approx_lat: asNumber(row.approx_lat),
    approx_lng: asNumber(row.approx_lng),
    amenities: row.amenities ?? [],
  };
}

function normalizeFee(fee: ListingFee): ListingFee {
  return { ...fee, amount_cents: asNumber(fee.amount_cents) ?? 0 };
}

function groupByListing<T extends { listing_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const list = grouped.get(row.listing_id) ?? [];
    list.push(row);
    grouped.set(row.listing_id, list);
  }
  return grouped;
}

async function loadPublicListings(): Promise<PublicListing[]> {
  const supabase = createPublicClient();
  const { data: rows, error } = await supabase
    .from("listings_public")
    .select("*")
    .eq("status", "approved");

  if (error) {
    throw new Error("Could not load listings");
  }

  const listings = (rows ?? []).map((row) => normalizeListing(row));
  if (listings.length === 0) return [];

  const ids = listings.map((listing) => listing.id);
  const locationIds = [...new Set(listings.map((listing) => listing.location_id))];

  const [feesResult, photosResult, windowsResult, locationsResult] = await Promise.all([
    supabase.from("listing_fees").select("*").in("listing_id", ids),
    supabase.from("listing_photos").select("*").in("listing_id", ids),
    supabase.from("availability_windows").select("*").in("listing_id", ids),
    supabase.from("locations").select("*").in("id", locationIds),
  ]);

  if (feesResult.error || photosResult.error || windowsResult.error || locationsResult.error) {
    throw new Error("Could not load listing details");
  }

  const fees = groupByListing((feesResult.data ?? []).map(normalizeFee));
  const photos = groupByListing(photosResult.data ?? []);
  const windows = groupByListing(windowsResult.data ?? []);
  const locations = new Map(
    (locationsResult.data ?? []).map((location) => [location.id, location]),
  );

  return listings.flatMap((listing) => {
    const location = locations.get(listing.location_id);
    if (!location) return [];
    return [
      {
        ...listing,
        location,
        fees: fees.get(listing.id) ?? [],
        photos: photos.get(listing.id) ?? [],
        availability_windows: windows.get(listing.id) ?? [],
      },
    ];
  });
}

export const getPublicListings = cache(loadPublicListings);

export const getListingBySlug = cache(async (slug: string) => {
  const listings = await getPublicListings();
  return listings.find((listing) => listing.slug === slug) ?? null;
});

export function filterListings(
  listings: PublicListing[],
  query: ListingQuery,
): PublicListing[] {
  return listings.filter((listing) => {
    if (query.where) {
      const regionSlug = listing.location.region.toLowerCase().replaceAll(" ", "-");
      const inPlace = listing.location.slug === query.where;
      const inRegion = regionSlug === query.where;
      if (!inPlace && !inRegion) return false;
    }

    if (
      query.budgetCents !== undefined &&
      listing.monthly_rent_cents > query.budgetCents
    ) {
      return false;
    }

    if (
      query.stayMonths !== undefined &&
      listing.min_stay_months > query.stayMonths
    ) {
      return false;
    }

    if (query.moveIn && listing.availability_windows.length > 0) {
      const open = listing.availability_windows.some((window) => {
        if (window.available_from > query.moveIn!) return false;
        if (window.available_to && window.available_to < query.moveIn!) {
          return false;
        }
        return true;
      });
      if (!open) return false;
    }

    if (query.type && listing.property_type !== query.type) return false;
    if (query.studioOnly && listing.bedrooms !== 0) return false;
    if (
      query.bedroomsMin !== undefined &&
      listing.bedrooms < query.bedroomsMin
    ) {
      return false;
    }
    if (query.pets && !listing.pets_allowed) return false;
    if (
      query.minStay !== undefined &&
      listing.min_stay_months > query.minStay
    ) {
      return false;
    }

    return true;
  });
}

export function sortByRecentConfirmation(
  listings: PublicListing[],
): PublicListing[] {
  return [...listings].sort((a, b) => {
    const left = latestConfirmedAt(a.availability_windows) ?? "";
    const right = latestConfirmedAt(b.availability_windows) ?? "";
    if (left !== right) return left < right ? 1 : -1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });
}

export function monthlyTotalCents(
  listing: Pick<PublicListing, "monthly_rent_cents" | "fees">,
): number {
  const monthlyFees = listing.fees
    .filter((fee) => fee.frequency === "monthly")
    .reduce((sum, fee) => sum + fee.amount_cents, 0);
  return listing.monthly_rent_cents + monthlyFees;
}

export function orderedFees(fees: ListingFee[]): ListingFee[] {
  return [...fees].sort(
    (a, b) => FEE_ORDER.indexOf(a.kind) - FEE_ORDER.indexOf(b.kind),
  );
}

/** Monthly charges, then one-time fees, with the deposit last. */
export function costTableFees(fees: ListingFee[]): ListingFee[] {
  const monthly = fees.filter((fee) => fee.frequency === "monthly");
  const oneTime = fees.filter(
    (fee) => fee.frequency === "one_time" && fee.kind !== "deposit",
  );
  const deposits = fees.filter((fee) => fee.kind === "deposit");
  return [...orderedFees(monthly), ...orderedFees(oneTime), ...orderedFees(deposits)];
}

export function formatFee(fee: ListingFee): string {
  if (fee.kind === "utilities" && fee.amount_cents === 0) {
    return "Utilities included";
  }
  const amount = formatCents(fee.amount_cents);
  if (fee.frequency === "monthly" && fee.kind !== "utilities") {
    return `${fee.label} ${amount}/mo`;
  }
  return `${fee.label} ${amount}`;
}

export function formatBrowseFee(fee: ListingFee): string {
  if (fee.kind === "utilities" && fee.amount_cents === 0) {
    return "Utilities included";
  }
  const amount = formatCents(fee.amount_cents);
  if (fee.frequency === "monthly") return `${fee.label} ${amount}/mo`;
  return `${fee.label} ${amount}`;
}

export function feeAmountLabel(fee: ListingFee): string {
  if (fee.kind === "utilities" && fee.amount_cents === 0) return "Included";
  const amount = formatCents(fee.amount_cents);
  return fee.frequency === "monthly" ? `${amount} / month` : `${amount} one time`;
}

export function propertyTypeLabel(type: PropertyType): string {
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

export function managementLabel(management: ListingManagement): string {
  return management === "fk_managed" ? "Furnished Keys managed" : "Self-managed";
}

export function bedLabel(bedrooms: number): string {
  if (bedrooms === 0) return "Studio";
  return bedrooms === 1 ? "1 bed" : `${bedrooms} bed`;
}

export function bathLabel(bathrooms: number): string {
  const value = Number(bathrooms);
  const text = Number.isInteger(value) ? String(value) : String(value);
  return value === 1 ? "1 bath" : `${text} bath`;
}

export function minStayTag(months: number): string {
  return months === 1 ? "1-month min" : `${months}-month min`;
}

export function minimumStayLabel(months: number): string {
  return months === 1 ? "1-month minimum" : `${months}-month minimum`;
}

export function sortedPhotos(listing: PublicListing): ListingPhoto[] {
  return [...listing.photos].sort((a, b) => a.sort - b.sort);
}

export function listingFacts(
  listing: Pick<
    PublicListing,
    "bedrooms" | "max_occupants" | "pet_policy" | "pets_allowed"
  >,
): string {
  const pets =
    listing.pet_policy?.trim() ||
    (listing.pets_allowed ? "Pets allowed" : "No pets");
  return `${bedLabel(listing.bedrooms)} · Sleeps ${listing.max_occupants} · ${pets}`;
}

export function browseMeta(listing: PublicListing): string {
  return `${propertyTypeLabel(listing.property_type)} · ${bedLabel(listing.bedrooms)} · Sleeps ${listing.max_occupants}`;
}

export function petTag(listing: Pick<PublicListing, "pet_policy" | "pets_allowed">): string {
  return (
    listing.pet_policy?.trim() ||
    (listing.pets_allowed ? "Pets allowed" : "No pets")
  );
}

export function latestConfirmedAt(windows: AvailabilityWindow[]): string | null {
  const stamps = windows
    .map((window) => window.last_confirmed_at)
    .filter((stamp): stamp is string => Boolean(stamp));
  if (stamps.length === 0) return null;
  return [...stamps].sort((a, b) => (a < b ? 1 : -1))[0] ?? null;
}

export function primaryWindow(
  windows: AvailabilityWindow[],
): AvailabilityWindow | undefined {
  if (windows.length === 0) return undefined;
  return [...windows].sort((a, b) => {
    const left = a.last_confirmed_at ?? "";
    const right = b.last_confirmed_at ?? "";
    if (left === right) return a.available_from < b.available_from ? -1 : 1;
    return left < right ? 1 : -1;
  })[0];
}

export function confirmedDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(iso));
}

export function confirmationLabel(iso: string): string {
  return `Availability confirmed ${confirmedDay(iso)}`;
}

export function primaryPhoto(listing: PublicListing): ListingPhoto | undefined {
  return sortedPhotos(listing)[0];
}
