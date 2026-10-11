import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { PublicListing } from "./listings";
import {
  confirmationLabel,
  costTableFees,
  filterListings,
  formatBrowseFee,
  formatFee,
  monthlyTotalCents,
  orderedFees,
  sortByRecentConfirmation,
} from "./listings";

function listing(partial: Partial<PublicListing> & Pick<PublicListing, "slug">): PublicListing {
  return {
    id: partial.slug,
    owner_id: "owner",
    location_id: "location",
    slug: partial.slug,
    title: partial.title ?? partial.slug,
    description: partial.description ?? "",
    property_type: partial.property_type ?? "adu",
    bedrooms: partial.bedrooms ?? 1,
    bathrooms: partial.bathrooms ?? 1,
    max_occupants: partial.max_occupants ?? 2,
    pets_allowed: partial.pets_allowed ?? false,
    pet_policy: partial.pet_policy ?? null,
    monthly_rent_cents: partial.monthly_rent_cents ?? 100_000,
    min_stay_months: partial.min_stay_months ?? 1,
    max_stay_months: partial.max_stay_months ?? null,
    amenities: partial.amenities ?? [],
    house_rules: partial.house_rules ?? null,
    approx_lat: partial.approx_lat ?? 44.05,
    approx_lng: partial.approx_lng ?? -121.31,
    management: partial.management ?? "self_managed",
    status: "approved",
    is_demo: true,
    listing_fee_status: "waived",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    location: partial.location ?? {
      id: "location",
      slug: "bend",
      name: "Bend",
      region: "Deschutes County",
      state: "OR",
      country: "US",
      active: true,
      sort: 1,
    },
    fees: partial.fees ?? [],
    photos: partial.photos ?? [],
    availability_windows: partial.availability_windows ?? [
      {
        id: "window",
        listing_id: partial.slug,
        available_from: "2026-11-01",
        available_to: null,
        last_confirmed_at: "2026-10-01T00:00:00.000Z",
        confirmed_by: null,
      },
    ],
  };
}

describe("listing catalog", () => {
  it("reads the public view instead of local fixtures", () => {
    const source = readFileSync(new URL("./listings.ts", import.meta.url), "utf8");
    expect(source).toContain('from("listings_public")');
    expect(source).not.toContain("demoListings");
    expect(source).not.toMatch(/select\([^)]*address_private/);
  });

  it("keeps rent separate from each fee and confirms availability from last_confirmed_at", () => {
    const utilities = {
      id: "u",
      listing_id: "l",
      kind: "utilities" as const,
      label: "Estimated utilities",
      amount_cents: 18_000,
      frequency: "monthly" as const,
      refundable: false,
    };
    const deposit = {
      id: "d",
      listing_id: "l",
      kind: "deposit" as const,
      label: "Security deposit",
      amount_cents: 245_000,
      frequency: "one_time" as const,
      refundable: true,
    };
    const cleaning = {
      id: "c",
      listing_id: "l",
      kind: "cleaning" as const,
      label: "Departure cleaning",
      amount_cents: 15_000,
      frequency: "one_time" as const,
      refundable: false,
    };

    expect(orderedFees([cleaning, deposit, utilities]).map(formatFee)).toEqual([
      "Estimated utilities $180",
      "Security deposit $2,450",
      "Departure cleaning $150",
    ]);
    expect(formatBrowseFee(utilities)).toBe("Estimated utilities $180/mo");
    expect(costTableFees([deposit, cleaning, utilities]).map((fee) => fee.kind)).toEqual([
      "utilities",
      "cleaning",
      "deposit",
    ]);
    expect(
      monthlyTotalCents({
        monthly_rent_cents: 245_000,
        fees: [utilities, deposit, cleaning],
      }),
    ).toBe(263_000);
    expect(confirmationLabel("2026-10-01T00:00:00.000Z")).toBe(
      "Availability confirmed Sep 30",
    );
  });

  it("filters by place, budget, stay, type, pets, and move-in, then sorts by confirmation", () => {
    const city = listing({
      slug: "city-home",
      monthly_rent_cents: 180_000,
      min_stay_months: 1,
      property_type: "apartment",
      pets_allowed: false,
      availability_windows: [
        {
          id: "w1",
          listing_id: "city-home",
          available_from: "2026-11-01",
          available_to: null,
          last_confirmed_at: "2026-10-08T00:00:00.000Z",
          confirmed_by: null,
        },
      ],
    });
    const county = listing({
      slug: "county-home",
      monthly_rent_cents: 300_000,
      min_stay_months: 3,
      property_type: "house",
      pets_allowed: true,
      bedrooms: 3,
      location: {
        id: "county",
        slug: "deschutes-county",
        name: "Deschutes County",
        region: "Central Oregon",
        state: "OR",
        country: "US",
        active: true,
        sort: 2,
      },
      availability_windows: [
        {
          id: "w2",
          listing_id: "county-home",
          available_from: "2026-12-01",
          available_to: "2027-06-01",
          last_confirmed_at: "2026-10-11T00:00:00.000Z",
          confirmed_by: null,
        },
      ],
    });
    const listings = [city, county];

    expect(filterListings(listings, { where: "bend" }).map((item) => item.slug)).toEqual([
      "city-home",
    ]);
    expect(
      filterListings(listings, { where: "deschutes-county" }).map((item) => item.slug),
    ).toEqual(["city-home", "county-home"]);
    expect(filterListings(listings, { budgetCents: 200_000 }).map((item) => item.slug)).toEqual([
      "city-home",
    ]);
    expect(filterListings(listings, { stayMonths: 1 }).map((item) => item.slug)).toEqual([
      "city-home",
    ]);
    expect(filterListings(listings, { type: "house" }).map((item) => item.slug)).toEqual([
      "county-home",
    ]);
    expect(filterListings(listings, { pets: true }).map((item) => item.slug)).toEqual([
      "county-home",
    ]);
    expect(filterListings(listings, { moveIn: "2026-10-01" })).toHaveLength(0);
    expect(sortByRecentConfirmation(listings)[0]?.slug).toBe("county-home");
  });
});
