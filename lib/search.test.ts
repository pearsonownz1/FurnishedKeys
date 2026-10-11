import { describe, expect, it } from "vitest";
import {
  calendarMin,
  defaultMoveIn,
  isIsoDate,
  listingQueryString,
  moveInOptions,
  moveOutAfterMoveInChange,
  parseListingQuery,
  stayLinkQuery,
} from "./search";

describe("search", () => {
  it("defaults move-in to the first of next month", () => {
    const now = new Date("2026-10-11T15:00:00.000Z");
    expect(defaultMoveIn(now)).toBe("2026-11-01");
    expect(moveInOptions(now)[0]).toEqual({
      value: "2026-11-01",
      label: "Nov 1",
    });
  });

  it("rejects dates that are not real calendar days", () => {
    expect(isIsoDate("2026-11-01")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("11/01/2026")).toBe(false);
    expect(parseListingQuery({ moveIn: "2026-02-31", moveOut: "2026-13-01" })).toEqual({});
  });

  it("uses today as the calendar floor and lets move-in raise it", () => {
    expect(calendarMin("2026-10-11")).toBe("2026-10-11");
    expect(calendarMin("2026-10-11", "2026-11-01")).toBe("2026-11-01");
    expect(calendarMin("2026-10-11", "2026-10-01")).toBe("2026-10-11");
    expect(calendarMin(null, "not-a-date")).toBeNull();
  });

  it("clears move-out when move-in moves past it", () => {
    expect(moveOutAfterMoveInChange("2026-12-01", "2026-11-15")).toBe("");
    expect(moveOutAfterMoveInChange("2026-11-01", "2026-12-01")).toBe("2026-12-01");
    expect(moveOutAfterMoveInChange("2026-11-01", "2026-11-01")).toBe("2026-11-01");
  });

  it("parses rental query params and maps a legacy stay onto move-out", () => {
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
      moveOut: "2027-02-01",
      stayMonths: 3,
      budgetCents: 250000,
      view: "map",
    });
    expect(
      parseListingQuery({
        "move-in": "2026-11-01",
        stay: "1",
      }),
    ).toMatchObject({
      moveIn: "2026-11-01",
      moveOut: "2026-12-01",
      stayMonths: 1,
    });
  });

  it("reads moveIn, moveOut, and flexible, and drops an end that is not after move-in", () => {
    expect(
      parseListingQuery({
        moveIn: "2026-11-01",
        moveOut: "2027-02-01",
        flexible: "1",
      }),
    ).toEqual({
      moveIn: "2026-11-01",
      flexible: true,
    });
    expect(
      parseListingQuery({
        moveIn: "2026-11-15",
        moveOut: "2026-11-01",
      }),
    ).toEqual({ moveIn: "2026-11-15" });
    expect(
      listingQueryString({
        where: "bend",
        moveIn: "2026-11-01",
        moveOut: "2027-02-01",
        flexible: true,
        budgetCents: 250000,
      }),
    ).toBe("?where=bend&moveIn=2026-11-01&flexible=1&budget_cents=250000");
    expect(
      stayLinkQuery({
        moveIn: "2026-11-01",
        moveOut: "2027-02-01",
        where: "bend",
      }),
    ).toBe("?moveIn=2026-11-01&moveOut=2027-02-01");
  });
});
