import type { Location } from "@/lib/db/types";
import type { PublicListing } from "@/lib/listings";
import { locationById } from "@/lib/locations";

function bendLocation(): Location {
  const location = locationById("c3a1e0b2-4d5f-4a6b-8c7d-111111111101");
  if (!location) throw new Error("Fixture location is missing");
  return location;
}

const bend = bendLocation();

/**
 * Local catalog used only when a non-production build cannot read the database.
 * These rows omit address_private.
 */
export function fixtureListings(): PublicListing[] {
  return fixtureRows().map((listing) => ({ ...listing, rooms: [], blocked_dates: [] }));
}

function fixtureRows(): Omit<PublicListing, "rooms" | "blocked_dates">[] {
  const location = bend;
  return [
    {
      id: "d1000001-0000-4000-8000-000000000001",
      owner_id: "0a11ce00-0000-4000-8000-0000000000aa",
      location_id: location.id,
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
      square_feet: null,
      space_description: null,
      smoking_allowed: false,
      calendar_updated_at: null,
      good_for: [],
      approx_lat: 44.04,
      approx_lng: -121.33,
      management: "self_managed",
      status: "approved",
      is_demo: true,
      listing_fee_status: "waived",
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-10-01T18:00:00.000Z",
      updated_at: "2026-10-08T18:00:00.000Z",
      location,
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
          is_cover: false,
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
      owner_id: "0a11ce00-0000-4000-8000-0000000000aa",
      location_id: location.id,
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
      square_feet: null,
      space_description: null,
      smoking_allowed: false,
      calendar_updated_at: null,
      good_for: [],
      approx_lat: 44.08,
      approx_lng: -121.35,
      management: "self_managed",
      status: "approved",
      is_demo: true,
      listing_fee_status: "waived",
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-10-01T18:00:00.000Z",
      updated_at: "2026-10-09T18:00:00.000Z",
      location,
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
          is_cover: false,
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
      owner_id: "0a11ce00-0000-4000-8000-0000000000aa",
      location_id: location.id,
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
      square_feet: null,
      space_description: null,
      smoking_allowed: false,
      calendar_updated_at: null,
      good_for: [],
      approx_lat: 44.06,
      approx_lng: -121.31,
      management: "fk_managed",
      status: "approved",
      is_demo: true,
      listing_fee_status: "waived",
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: "2026-10-01T18:00:00.000Z",
      updated_at: "2026-10-10T18:00:00.000Z",
      location,
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
          is_cover: false,
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
}
