import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toInquiryInsert, validateInquiry, type InquiryInput } from "./inquiry";

const base: InquiryInput = {
  listingId: "00000000-0000-4000-8000-0000000000a1",
  moveIn: "2026-11-01",
  moveOut: "2027-02-01",
  occupants: 1,
  pets: "",
  name: "QA test – delete",
  email: "qa-test@furnishedkeys.com",
  phone: "541-555-0100",
  message: "A quiet stay for work.",
};

const constraints = {
  minStayMonths: 3,
  maxOccupants: 2,
  petsAllowed: true,
  availability: [
    {
      id: "window",
      listing_id: base.listingId,
      available_from: "2026-11-01",
      available_to: null,
      last_confirmed_at: "2026-10-08T18:00:00.000Z",
      confirmed_by: null,
    },
  ],
};

describe("validateInquiry", () => {
  it("accepts a stay that meets the minimum and the window", () => {
    expect(validateInquiry(base, constraints).ok).toBe(true);
  });

  it("rejects a short stay, too many people, and pets when they are not allowed", () => {
    const result = validateInquiry(
      { ...base, moveOut: "2026-12-01", occupants: 4, pets: "1 dog" },
      { ...constraints, petsAllowed: false },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.moveOut).toMatch(/3-month minimum/);
      expect(result.fieldErrors.occupants).toMatch(/sleeps 2/i);
      expect(result.fieldErrors.pets).toMatch(/does not allow pets/);
    }
  });

  it("accepts an open-ended stay and stores move-out as null", () => {
    const input = { ...base, moveOut: "", flexible: true };
    expect(validateInquiry(input, constraints).ok).toBe(true);
    expect(toInquiryInsert(input).move_out).toBeNull();
    expect(toInquiryInsert(input)).not.toHaveProperty("flexible");
  });

  it("still requires a move-out when the renter did not mark the stay open-ended", () => {
    const result = validateInquiry({ ...base, moveOut: "" }, constraints);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.moveOut).toMatch(/move-out/i);
  });

  it("rejects a stay that overlaps a blocked day", () => {
    const result = validateInquiry(base, {
      ...constraints,
      blockedDates: ["2026-11-15"],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.moveIn).toMatch(/blocked day/);
  });
});

describe("toInquiryInsert", () => {
  it("builds an anonymous insert and does not read the row back", () => {
    expect(toInquiryInsert(base)).toEqual({
      listing_id: base.listingId,
      renter_id: null,
      name: base.name,
      email: base.email,
      phone: base.phone,
      move_in: base.moveIn,
      move_out: base.moveOut,
      occupants: 1,
      pets: null,
      message: base.message,
      status: "new",
      assigned_to: null,
    });

    const action = readFileSync(
      new URL("../app/(site)/rentals/actions.ts", import.meta.url),
      "utf8",
    );
    expect(action).toContain('.from("inquiries")');
    expect(action).toContain(".insert(");
    expect(action).toContain("logInsertError");
    expect(action).not.toMatch(/\.insert\([\s\S]*?\)\s*\.select\(/);
    expect(action).not.toMatch(/\.single\(/);
    const insertAt = action.indexOf(".insert(");
    const emailAt = action.indexOf("await deliverInquiryNotice");
    const demoAt = action.indexOf("listing.is_demo");
    expect(demoAt).toBeGreaterThan(-1);
    expect(demoAt).toBeLessThan(insertAt);
    expect(emailAt).toBeGreaterThan(insertAt);

    const policy = readFileSync(
      new URL("../supabase/migrations/20261011112445_inquiries_public_non_demo.sql", import.meta.url),
      "utf8",
    );
    expect(policy).toContain("private.listing_is_public(listing_id)");
    expect(policy).toContain("not (select private.listing_is_demo(listing_id))");
    expect(policy).toContain("policy inquiries_insert");
  });
});
