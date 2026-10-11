import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toOwnerLeadInsert, validateOwnerLead, type OwnerLeadInput } from "./leads";

const base: OwnerLeadInput = {
  name: "QA test – delete",
  email: "qa-test@furnishedkeys.com",
  phone: "541-555-0100",
  interest: "full_management",
  propertyType: "house",
  furnished: "yes",
  locationId: "c3a1e0b2-4d5f-4a6b-8c7d-111111111101",
  propertyAddress: "A sample street",
  currentUse: "Vacant",
  availableFrom: "2026-12-01",
  notes: "Has a garage.",
  source: "letter",
};

describe("validateOwnerLead", () => {
  it("rejects a forced invalid interest and leaves notes untouched", () => {
    const result = validateOwnerLead({ ...base, interest: "nope" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.interest).toBe("Choose how you'd like to list.");
    }

    const row = toOwnerLeadInsert(base);
    expect(row.interest).toBe("full_management");
    expect(row.notes).toBe("Has a garage.");
    expect(row.notes).not.toMatch(/Interest:/);
    expect(row.source).toBe("letter");
  });

  it("omits a skipped interest and an invalid source", () => {
    const row = toOwnerLeadInsert({ ...base, interest: "", source: "Not a slug!" });
    expect(row.interest).toBeNull();
    expect(row).not.toHaveProperty("source");
    expect(row.notes).toBe("Has a garage.");
  });
});

describe("owner lead insert", () => {
  it("inserts anonymously and does not read the row back", () => {
    expect(toOwnerLeadInsert(base)).toMatchObject({
      name: base.name,
      email: base.email,
      status: "new",
      assigned_to: null,
      interest: "full_management",
    });

    const action = readFileSync(
      new URL("../app/(site)/owners/actions.ts", import.meta.url),
      "utf8",
    );
    expect(action).toContain(".insert(");
    expect(action).not.toMatch(/\.insert\([\s\S]*?\)\s*\.select\(/);
    expect(action).not.toMatch(/\.single\(/);
  });
});
