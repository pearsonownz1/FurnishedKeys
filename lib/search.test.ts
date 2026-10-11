import { describe, expect, it } from "vitest";
import { defaultMoveIn, moveInOptions, parseListingQuery } from "./search";

describe("search", () => {
  it("defaults move-in to the first of next month", () => {
    const now = new Date("2026-10-11T15:00:00.000Z");
    expect(defaultMoveIn(now)).toBe("2026-11-01");
    expect(moveInOptions(now)[0]).toEqual({
      value: "2026-11-01",
      label: "Nov 1",
    });
  });

  it("parses rental query params", () => {
    expect(
      parseListingQuery({
        where: "bend",
        move_in: "2026-11-01",
        stay_months: "3",
        budget_cents: "250000",
        view: "map",
      }),
    ).toEqual({
      where: "bend",
      moveIn: "2026-11-01",
      stayMonths: 3,
      budgetCents: 250000,
      view: "map",
    });
  });
});
