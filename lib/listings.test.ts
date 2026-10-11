import { describe, expect, it } from "vitest";
import {
  confirmationLabel,
  filterListings,
  formatFee,
  getDemoListings,
  getPublicListings,
  minimumStayLabel,
  orderedFees,
} from "./listings";

function decimalPlaces(value: number): number {
  const text = value.toString();
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

describe("listing fixtures", () => {
  it("matches the listings, fees, photos, and availability columns", () => {
    const listings = getDemoListings();
    expect(listings).toHaveLength(3);
    expect(listings.every((listing) => listing.is_demo)).toBe(true);

    for (const listing of listings) {
      expect(listing).toEqual(
        expect.objectContaining({
          property_type: expect.stringMatching(
            /^(adu|apartment|room|house|other)$/,
          ),
          management: expect.stringMatching(/^(self_managed|fk_managed)$/),
          status: expect.stringMatching(
            /^(draft|pending_review|approved|rejected|archived)$/,
          ),
          listing_fee_status: expect.stringMatching(/^(unpaid|paid|waived)$/),
        }),
      );
      expect(listing.address_private).toBeNull();
      expect(decimalPlaces(listing.approx_lat)).toBeLessThanOrEqual(2);
      expect(decimalPlaces(listing.approx_lng)).toBeLessThanOrEqual(2);
      expect(listing.monthly_rent_cents).toBeGreaterThan(0);

      for (const fee of listing.fees) {
        expect(fee.listing_id).toBe(listing.id);
        expect(fee.kind).not.toBe("rent");
        expect(["utilities", "deposit", "cleaning", "pet", "other"]).toContain(
          fee.kind,
        );
        expect(["one_time", "monthly"]).toContain(fee.frequency);
      }

      for (const photo of listing.photos) {
        expect(photo).toEqual(
          expect.objectContaining({
            listing_id: listing.id,
            storage_path: expect.any(String),
            sort: expect.any(Number),
          }),
        );
      }

      for (const window of listing.availability_windows) {
        expect(window.listing_id).toBe(listing.id);
        expect(window.available_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(window.last_confirmed_at).toBeTruthy();
      }
    }
  });

  it("keeps rent separate from each fee and confirms availability from last_confirmed_at", () => {
    const [adu, pines, garden] = getPublicListings();
    expect(adu && pines && garden).toBeTruthy();
    expect("address_private" in adu!).toBe(false);

    expect(orderedFees(adu!.fees).map(formatFee)).toEqual([
      "Utilities $120",
      "Deposit $1,000",
    ]);
    expect(formatFee(pines!.fees[0]!)).toBe("Utilities included");
    expect(formatFee(pines!.fees[1]!)).toBe("Deposit $1,500");
    expect(orderedFees(garden!.fees).map(formatFee)).toEqual([
      "Utilities $90",
      "Pet fee $40/mo",
    ]);
    expect(minimumStayLabel(adu!.min_stay_months)).toBe("3-month minimum");
    expect(confirmationLabel(adu!.availability_windows[0]!.last_confirmed_at)).toBe(
      "Availability confirmed Oct 8",
    );
    expect(confirmationLabel(pines!.availability_windows[0]!.last_confirmed_at)).toBe(
      "Availability confirmed Oct 9",
    );
    expect(confirmationLabel(garden!.availability_windows[0]!.last_confirmed_at)).toBe(
      "Availability confirmed Oct 10",
    );
  });

  it("filters by place, budget, stay length, and move-in", () => {
    const listings = getPublicListings();

    expect(filterListings(listings, { where: "deschutes-county" })).toHaveLength(3);
    expect(filterListings(listings, { budgetCents: 200_000 }).map((l) => l.slug)).toEqual([
      "detached-adu-river-trail",
    ]);
    expect(filterListings(listings, { stayMonths: 1 }).map((l) => l.slug)).toEqual([
      "one-bedroom-pine-views",
    ]);
    expect(filterListings(listings, { moveIn: "2026-10-01" })).toHaveLength(0);
    expect(filterListings(listings, { moveIn: "2026-11-15" })).toHaveLength(3);
    expect(filterListings(listings, { moveIn: "2027-06-01" }).map((l) => l.slug)).toEqual([
      "detached-adu-river-trail",
      "garden-apartment-downtown",
    ]);
  });
});
