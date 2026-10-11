import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { amenityCatalog, amenityGroups, amenityKeys } from "./amenities";
import { goodForCatalog, goodForKeys } from "./good-for";
import { calendarSchema, patchListingSchema } from "./schemas";
import {
  bedroomInserts,
  coverPhotoId,
  MAX_LISTING_PHOTOS,
  photosExceedLimit,
  publicLandlordName,
} from "./setup";

describe("amenity and good_for catalogs", () => {
  it("groups kitchen, interior, safety, and laundry keys", () => {
    expect(amenityGroups).toEqual(["Kitchen", "Interior", "Safety", "Laundry"]);
    for (const key of [
      "dining_table",
      "full_fridge",
      "dishwasher",
      "microwave",
      "stovetop",
      "kitchen_essentials",
      "air_conditioning",
      "heating",
      "wifi",
      "carbon_monoxide_detector",
      "smoke_detector",
      "washer_dryer",
    ]) {
      expect(amenityKeys).toContain(key);
    }
    expect(new Set(amenityCatalog.map((item) => item.group))).toEqual(new Set(amenityGroups));
  });

  it("lists the good_for keys with labels", () => {
    expect(goodForKeys).toEqual([
      "ski_season",
      "traveling_nurses",
      "relocating",
      "between_homes",
      "remote_workers",
      "contract_workers",
      "students",
    ]);
    expect(goodForCatalog.every((item) => item.label.length > 0)).toBe(true);
  });

  it("accepts catalog keys on PATCH and rejects anything else", () => {
    const parsed = patchListingSchema.safeParse({
      square_feet: 980,
      space_description: "A bright loft with a desk by the window.",
      smoking_allowed: false,
      amenities: ["wifi", "washer_dryer"],
      good_for: ["remote_workers", "relocating"],
      bedrooms: [{ beds: "King bed" }, { label: "Bunk room", beds: "3x Bunk beds" }],
    });
    expect(parsed.success).toBe(true);

    expect(patchListingSchema.safeParse({ amenities: ["pool"] }).success).toBe(false);
    expect(patchListingSchema.safeParse({ good_for: ["tourists"] }).success).toBe(false);
    expect(patchListingSchema.safeParse({ good_for: ["students", "students"] }).success).toBe(
      false,
    );
    expect(patchListingSchema.safeParse({ square_feet: 0 }).success).toBe(false);
    expect(patchListingSchema.safeParse({ bedrooms: 2 }).success).toBe(false);
  });
});

describe("setup helpers", () => {
  it("replaces bedrooms in order and leaves the label for the database default", () => {
    expect(
      bedroomInserts("listing-1", [{ beds: "Queen bed" }, { label: "Den", beds: "Sofa bed" }]),
    ).toEqual([
      { listing_id: "listing-1", sort: 1, beds: "Queen bed" },
      { listing_id: "listing-1", sort: 2, beds: "Sofa bed", label: "Den" },
    ]);
  });

  it("picks the first photo as the cover and stops at 20", () => {
    expect(
      coverPhotoId([
        { id: "b", is_cover: false, sort: 2 },
        { id: "a", is_cover: false, sort: 1 },
      ]),
    ).toBe("a");
    expect(coverPhotoId([{ id: "a", is_cover: true, sort: 2 }])).toBeNull();
    expect(photosExceedLimit(18, 3)).toBe(true);
    expect(photosExceedLimit(18, 2)).toBe(false);
    expect(MAX_LISTING_PHOTOS).toBe(20);
  });

  it("splits a public landlord name into a first name and last initial", () => {
    expect(publicLandlordName("Ada Lovelace")).toEqual({
      first_name: "Ada",
      last_initial: "L",
    });
    expect(publicLandlordName("  Guy   Pearson  ")).toEqual({
      first_name: "Guy",
      last_initial: "P",
    });
    expect(publicLandlordName("Madonna")).toEqual({
      first_name: "Madonna",
      last_initial: null,
    });
    expect(publicLandlordName(null)).toEqual({ first_name: null, last_initial: null });
  });

  it("requires both availability and blocked dates on the calendar", () => {
    expect(
      calendarSchema.safeParse({
        availability: [{ available_from: "2026-11-01", available_to: null }],
        blocked_dates: [{ start_date: "2026-12-24", end_date: "2026-12-26", note: "Holiday" }],
      }).success,
    ).toBe(true);
    expect(
      calendarSchema.safeParse({
        availability: [],
        blocked_dates: [{ start_date: "2026-12-26", end_date: "2026-12-24" }],
      }).success,
    ).toBe(false);
  });
});

describe("public landlord function", () => {
  it("returns only the name card and not reply-time stats", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/20261011070000_listing_setup_fields.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("function public.public_listing_landlord(listing_id uuid)");
    expect(sql).toContain("first_name text");
    expect(sql).toContain("last_initial text");
    expect(sql).toContain("member_since timestamptz");
    expect(sql).not.toMatch(/answered_count|median_reply_hours|profile\.email|profile\.phone/);
  });
});
