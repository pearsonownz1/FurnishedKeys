import { locationById, type Location } from "@/lib/locations";
import { formatCents } from "@/lib/money";
import type { ListingQuery } from "@/lib/search";

/**
 * Demo fixtures shaped like Backend's tables so a later Supabase select can
 * replace `getPublicListings` without changing the UI.
 *
 * `listings`, `listing_fees`, `listing_photos`, `availability_windows`.
 * Public reads omit `address_private`. Coordinates are rounded and are not
 * an address. Backend types land in `lib/db/types.ts` — do not add that file here.
 */

export type PropertyType = "adu" | "apartment" | "room" | "house" | "other";
export type Management = "self_managed" | "fk_managed";
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "archived";
export type ListingFeeStatus = "unpaid" | "paid" | "waived";
export type FeeKind = "utilities" | "deposit" | "cleaning" | "pet" | "other";
export type FeeFrequency = "one_time" | "monthly";

export type ListingRow = {
  id: string;
  owner_id: string;
  location_id: string;
  slug: string;
  title: string;
  description: string;
  property_type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  max_occupants: number;
  pets_allowed: boolean;
  pet_policy: string | null;
  monthly_rent_cents: number;
  min_stay_months: number;
  max_stay_months: number | null;
  amenities: string[];
  house_rules: string | null;
  approx_lat: number;
  approx_lng: number;
  address_private: string | null;
  management: Management;
  status: ListingStatus;
  is_demo: boolean;
  listing_fee_status: ListingFeeStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingFee = {
  id: string;
  listing_id: string;
  kind: FeeKind;
  label: string;
  amount_cents: number;
  frequency: FeeFrequency;
  refundable: boolean;
};

export type ListingPhoto = {
  id: string;
  listing_id: string;
  storage_path: string;
  caption: string | null;
  sort: number;
};

export type AvailabilityWindow = {
  id: string;
  listing_id: string;
  available_from: string;
  available_to: string | null;
  last_confirmed_at: string;
  confirmed_by: string | null;
};

export type DemoListing = ListingRow & {
  fees: ListingFee[];
  photos: ListingPhoto[];
  availability_windows: AvailabilityWindow[];
};

export type PublicListing = Omit<ListingRow, "address_private"> & {
  location: Location;
  fees: ListingFee[];
  photos: ListingPhoto[];
  availability_windows: AvailabilityWindow[];
};

const DEMO_OWNER_ID = "0a11ce00-0000-4000-8000-0000000000aa";
const BEND_ID = "c3a1e0b2-4d5f-4a6b-8c7d-111111111101";

const demoListings: DemoListing[] = [
  {
    id: "d1000001-0000-4000-8000-000000000001",
    owner_id: DEMO_OWNER_ID,
    location_id: BEND_ID,
    slug: "detached-adu-river-trail",
    title: "Detached ADU near the river trail",
    description:
      "A furnished studio ADU near the river trail, with a kitchen, a place to work, and pines outside the windows.",
    property_type: "adu",
    bedrooms: 0,
    bathrooms: 1,
    max_occupants: 2,
    pets_allowed: true,
    pet_policy: "Pets considered",
    monthly_rent_cents: 185_000,
    min_stay_months: 3,
    max_stay_months: null,
    amenities: ["Furnished", "Washer and dryer", "Workspace", "Kitchen"],
    house_rules: "No smoking. Quiet hours after 10pm.",
    approx_lat: 44.04,
    approx_lng: -121.33,
    address_private: null,
    management: "self_managed",
    status: "approved",
    is_demo: true,
    listing_fee_status: "waived",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: "2026-10-01T18:00:00.000Z",
    updated_at: "2026-10-08T18:00:00.000Z",
    fees: [
      {
        id: "f1000001-0000-4000-8000-000000000011",
        listing_id: "d1000001-0000-4000-8000-000000000001",
        kind: "utilities",
        label: "Utilities",
        amount_cents: 12_000,
        frequency: "monthly",
        refundable: false,
      },
      {
        id: "f1000001-0000-4000-8000-000000000012",
        listing_id: "d1000001-0000-4000-8000-000000000001",
        kind: "deposit",
        label: "Deposit",
        amount_cents: 100_000,
        frequency: "one_time",
        refundable: true,
      },
    ],
    photos: [
      {
        id: "p1000001-0000-4000-8000-000000000011",
        listing_id: "d1000001-0000-4000-8000-000000000001",
        storage_path: "demo/p1.jpg",
        caption: "Detached ADU on a pine lot",
        sort: 0,
      },
    ],
    availability_windows: [
      {
        id: "a1000001-0000-4000-8000-000000000011",
        listing_id: "d1000001-0000-4000-8000-000000000001",
        available_from: "2026-11-01",
        available_to: null,
        last_confirmed_at: "2026-10-08T18:00:00.000Z",
        confirmed_by: null,
      },
    ],
  },
  {
    id: "d1000002-0000-4000-8000-000000000002",
    owner_id: DEMO_OWNER_ID,
    location_id: BEND_ID,
    slug: "one-bedroom-pine-views",
    title: "One-bedroom with pine views",
    description:
      "A furnished one-bedroom with a view into the pines. Quiet, light, and set up for a stay of a month or more.",
    property_type: "apartment",
    bedrooms: 1,
    bathrooms: 1,
    max_occupants: 2,
    pets_allowed: false,
    pet_policy: "No pets",
    monthly_rent_cents: 220_000,
    min_stay_months: 1,
    max_stay_months: 6,
    amenities: ["Furnished", "Pine views", "Parking", "Heating"],
    house_rules: "No pets. No parties. Park in the marked space.",
    approx_lat: 44.08,
    approx_lng: -121.35,
    address_private: null,
    management: "self_managed",
    status: "approved",
    is_demo: true,
    listing_fee_status: "waived",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: "2026-10-01T18:00:00.000Z",
    updated_at: "2026-10-09T18:00:00.000Z",
    fees: [
      {
        id: "f1000002-0000-4000-8000-000000000021",
        listing_id: "d1000002-0000-4000-8000-000000000002",
        kind: "utilities",
        label: "Utilities",
        amount_cents: 0,
        frequency: "monthly",
        refundable: false,
      },
      {
        id: "f1000002-0000-4000-8000-000000000022",
        listing_id: "d1000002-0000-4000-8000-000000000002",
        kind: "deposit",
        label: "Deposit",
        amount_cents: 150_000,
        frequency: "one_time",
        refundable: true,
      },
    ],
    photos: [
      {
        id: "p1000002-0000-4000-8000-000000000021",
        listing_id: "d1000002-0000-4000-8000-000000000002",
        storage_path: "demo/p2.jpg",
        caption: "Bedroom with pine views",
        sort: 0,
      },
    ],
    availability_windows: [
      {
        id: "a1000002-0000-4000-8000-000000000021",
        listing_id: "d1000002-0000-4000-8000-000000000002",
        available_from: "2026-11-01",
        available_to: "2027-05-01",
        last_confirmed_at: "2026-10-09T18:00:00.000Z",
        confirmed_by: null,
      },
    ],
  },
  {
    id: "d1000003-0000-4000-8000-000000000003",
    owner_id: DEMO_OWNER_ID,
    location_id: BEND_ID,
    slug: "garden-apartment-downtown",
    title: "Garden apartment, walk to downtown",
    description:
      "A furnished garden apartment within walking distance of downtown. Room for three, with a small patio off the kitchen.",
    property_type: "apartment",
    bedrooms: 1,
    bathrooms: 1,
    max_occupants: 3,
    pets_allowed: true,
    pet_policy: "Dogs OK",
    monthly_rent_cents: 205_000,
    min_stay_months: 2,
    max_stay_months: null,
    amenities: ["Furnished", "Walk to downtown", "Dishwasher", "Patio"],
    house_rules: "Dogs are welcome on the patio. No smoking indoors.",
    approx_lat: 44.06,
    approx_lng: -121.31,
    address_private: null,
    management: "fk_managed",
    status: "approved",
    is_demo: true,
    listing_fee_status: "waived",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: "2026-10-01T18:00:00.000Z",
    updated_at: "2026-10-10T18:00:00.000Z",
    fees: [
      {
        id: "f1000003-0000-4000-8000-000000000031",
        listing_id: "d1000003-0000-4000-8000-000000000003",
        kind: "utilities",
        label: "Utilities",
        amount_cents: 9_000,
        frequency: "monthly",
        refundable: false,
      },
      {
        id: "f1000003-0000-4000-8000-000000000032",
        listing_id: "d1000003-0000-4000-8000-000000000003",
        kind: "pet",
        label: "Pet fee",
        amount_cents: 4_000,
        frequency: "monthly",
        refundable: false,
      },
    ],
    photos: [
      {
        id: "p1000003-0000-4000-8000-000000000031",
        listing_id: "d1000003-0000-4000-8000-000000000003",
        storage_path: "demo/p3.jpg",
        caption: "Garden apartment kitchen",
        sort: 0,
      },
    ],
    availability_windows: [
      {
        id: "a1000003-0000-4000-8000-000000000031",
        listing_id: "d1000003-0000-4000-8000-000000000003",
        available_from: "2026-10-15",
        available_to: null,
        last_confirmed_at: "2026-10-10T18:00:00.000Z",
        confirmed_by: null,
      },
    ],
  },
];

const FEE_ORDER: FeeKind[] = [
  "utilities",
  "deposit",
  "cleaning",
  "pet",
  "other",
];

export function photoSrc(storagePath: string): string {
  if (storagePath.startsWith("demo/")) return `/${storagePath}`;
  return storagePath;
}

export function toPublicListing(row: DemoListing): PublicListing {
  const location = locationById(row.location_id);
  if (!location) {
    throw new Error(`Unknown location_id ${row.location_id}`);
  }

  const {
    address_private: privateAddress,
    fees,
    photos,
    availability_windows,
    ...listing
  } = row;

  // Public reads never include an exact address.
  void privateAddress;

  return {
    ...listing,
    location,
    fees,
    photos,
    availability_windows,
  };
}

export function getDemoListings(): DemoListing[] {
  return demoListings;
}

export function getPublicListings(): PublicListing[] {
  return demoListings
    .filter((listing) => listing.status === "approved")
    .map(toPublicListing);
}

export function getListingBySlug(slug: string): PublicListing | undefined {
  return getPublicListings().find((listing) => listing.slug === slug);
}

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

    return true;
  });
}

export function orderedFees(fees: ListingFee[]): ListingFee[] {
  return [...fees].sort(
    (a, b) => FEE_ORDER.indexOf(a.kind) - FEE_ORDER.indexOf(b.kind),
  );
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

export function minimumStayLabel(months: number): string {
  return months === 1 ? "1-month minimum" : `${months}-month minimum`;
}

export function listingFacts(
  listing: Pick<
    ListingRow,
    "bedrooms" | "max_occupants" | "pet_policy" | "pets_allowed"
  >,
): string {
  const beds =
    listing.bedrooms === 0
      ? "Studio"
      : listing.bedrooms === 1
        ? "1 bed"
        : `${listing.bedrooms} bed`;
  const pets =
    listing.pet_policy?.trim() ||
    (listing.pets_allowed ? "Pets allowed" : "No pets");
  return `${beds} · Sleeps ${listing.max_occupants} · ${pets}`;
}

export function latestConfirmedAt(
  windows: AvailabilityWindow[],
): string | null {
  if (windows.length === 0) return null;
  return [...windows].sort((a, b) =>
    a.last_confirmed_at < b.last_confirmed_at ? 1 : -1,
  )[0].last_confirmed_at;
}

export function confirmationLabel(iso: string): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(iso));
  return `Availability confirmed ${formatted}`;
}

export function primaryPhoto(listing: PublicListing): ListingPhoto | undefined {
  return [...listing.photos].sort((a, b) => a.sort - b.sort)[0];
}
