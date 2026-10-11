import { describe, expect, it } from "vitest";
import { collapseDates, expandRanges } from "./calendar-ranges";
import {
  bedroomPayload,
  calendarBody,
  emptyDraft,
  firstMissingStep,
  listingSteps,
  missingForStep,
  parseBeds,
  toListingPatch,
} from "./listing-draft";
import { calendarUpdatedLabel, goodForTags, landlordCard, trustCells } from "./property-display";

describe("listing draft", () => {
  it("puts Good for after Description and keeps the eight setup sections", () => {
    expect(listingSteps.map((step) => step.id)).toEqual([
      "basics",
      "rooms",
      "photos",
      "description",
      "goodFor",
      "amenities",
      "rent",
      "availability",
      "rules",
      "review",
    ]);
  });

  it("patches catalog fields and bedroom rows, not a bedroom count", () => {
    const draft = emptyDraft();
    draft.title = "Pine loft";
    draft.summary = "A quiet loft.";
    draft.space = "Desk by the window.";
    draft.squareFeet = "980";
    draft.noSmoking = true;
    draft.goodFor = ["remote_workers", "students"];
    draft.amenities = ["wifi", "washer_dryer"];
    draft.bedrooms = [
      {
        key: "1",
        label: "",
        bedType: "king",
        bunkCount: "",
        bedsText: "",
      },
      {
        key: "2",
        label: "Bunk room",
        bedType: "bunk",
        bunkCount: "3",
        bedsText: "",
      },
    ];
    draft.blockedDates = ["2026-12-24", "2026-12-25", "2026-12-26", "2026-12-28"];
    draft.availableFrom = "2026-11-01";

    const patch = toListingPatch(draft);
    expect(patch.square_feet).toBe(980);
    expect(patch.space_description).toBe("Desk by the window.");
    expect(patch.smoking_allowed).toBe(false);
    expect(patch.good_for).toEqual(["remote_workers", "students"]);
    expect(patch.amenities).toEqual(["wifi", "washer_dryer"]);
    expect(patch.bedrooms).toEqual([
      { beds: "King bed" },
      { label: "Bunk room", beds: "3x Bunk beds" },
    ]);
    expect(patch).not.toHaveProperty("availability");
    expect(calendarBody(draft).blocked_dates).toEqual([
      { start_date: "2026-12-24", end_date: "2026-12-26" },
      { start_date: "2026-12-28", end_date: "2026-12-28" },
    ]);
  });

  it("holds an unfinished bedroom out of the patch so the saved rows stay put", () => {
    const draft = emptyDraft();
    draft.bedrooms = [
      { key: "1", label: "Bedroom 1", bedType: "queen", bunkCount: "", bedsText: "" },
      { key: "2", label: "Bedroom 2", bedType: "", bunkCount: "", bedsText: "" },
    ];
    expect(bedroomPayload(draft.bedrooms)).toBeUndefined();
    expect(toListingPatch(draft)).not.toHaveProperty("bedrooms");
  });

  it("reads bed text back into the select", () => {
    expect(parseBeds("Queen bed").bedType).toBe("queen");
    expect(parseBeds("1x Bunk bed")).toEqual({ bedType: "bunk", bunkCount: "1", bedsText: "" });
    expect(parseBeds("Loft bed").bedsText).toBe("Loft bed");
  });

  it("maps submit gaps onto the matching step", () => {
    const missing = ["cover", "title", "bedroom", "min_stay"];
    expect(firstMissingStep(missing)).toBe("basics");
    expect(missingForStep(missing, "photos")).toEqual(["Pick a cover photo."]);
    expect(missingForStep(missing, "rooms")).toEqual(["Add a bedroom."]);
    expect(missingForStep(missing, "availability")).toEqual(["Add a minimum stay."]);
  });
});

describe("calendar ranges", () => {
  it("collapses and expands consecutive days", () => {
    const ranges = collapseDates(["2026-01-03", "2026-01-01", "2026-01-02", "2026-01-02"]);
    expect(ranges).toEqual([{ start_date: "2026-01-01", end_date: "2026-01-03" }]);
    expect(expandRanges(ranges)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
});

describe("property trust", () => {
  it("uses calendar_updated_at and the landlord card, never a reply-time cell", () => {
    const now = new Date("2026-10-11T12:00:00.000Z");
    expect(calendarUpdatedLabel("2026-10-11T01:00:00.000Z", now)).toBe("Calendar updated today");
    expect(calendarUpdatedLabel("2026-10-10T01:00:00.000Z", now)).toBe("Calendar updated yesterday");
    expect(calendarUpdatedLabel(null, now)).toBeNull();
    expect(goodForTags(["students", "tourists"])).toEqual(["Students"]);

    const cells = trustCells({
      calendarUpdatedAt: "2026-10-09T00:00:00.000Z",
      landlord: {
        first_name: "Ada",
        last_initial: "L",
        member_since: "2024-03-02T00:00:00.000Z",
      },
      now,
    });
    expect(cells.map((cell) => cell.id)).toEqual(["calendar", "landlord"]);
    expect(cells).toHaveLength(2);
    expect(JSON.stringify(cells)).not.toMatch(/repl/i);

    expect(landlordCard(null)).toBeNull();
    expect(
      trustCells({
        calendarUpdatedAt: null,
        landlord: null,
        now,
      }),
    ).toEqual([]);
  });
});
