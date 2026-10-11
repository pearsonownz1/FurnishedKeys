import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { toOwnerLeadInsert, validateOwnerLead, type OwnerLeadInput } from "./leads";
import { FREE_TO_LIST, listMyPropertyLabel } from "./pricing";

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

  it("requires an address and a property type", () => {
    const missing = validateOwnerLead({
      ...base,
      propertyAddress: "",
      propertyType: "",
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.fieldErrors.propertyAddress).toBe("Add the property address.");
      expect(missing.fieldErrors.propertyType).toBe("Choose a property type.");
    }
  });

  it("omits a skipped interest and an invalid source", () => {
    const row = toOwnerLeadInsert({ ...base, interest: "", source: "Not a slug!" });
    expect(row.interest).toBeNull();
    expect(row).not.toHaveProperty("source");
    expect(row.notes).toBe("Has a garage.");
  });
});

describe("owner lead insert", () => {
  it("keeps a row mapper ready and does not persist yet", () => {
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
    expect(action).toContain('.from("owner_leads").insert(');
    expect(action).toContain("logInsertError");
    expect(action).not.toMatch(/\.insert\([\s\S]*?\)\s*\.select\(/);
    expect(action).not.toMatch(/\.single\(/);
    expect(listMyPropertyLabel()).toBe("List my property");
    expect(FREE_TO_LIST).toBe("Free to list. We only earn when you rent.");

    const page = readFileSync(new URL("../app/(site)/owners/page.tsx", import.meta.url), "utf8");
    const start = readFileSync(new URL("../components/listing/start-form.tsx", import.meta.url), "utf8");
    const form = readFileSync(new URL("../components/owners/assessment-form.tsx", import.meta.url), "utf8");
    for (const phrase of [
      "Your furnished space",
      "Two ways to work with us",
      "Who&apos;s renting",
      "How it works",
      "We only publish a property after its owner submits and approves it.",
      "Pricing set in your free assessment",
      "Get a rental assessment",
      "listMyPropertyLabel()",
      "FREE_TO_LIST",
      "/owners/start?src=",
      "<AssessmentForm source={source} />",
    ]) {
      expect(page).toContain(phrase);
    }
    expect(page).toContain("We handle it for you");
    expect(page).not.toContain("Listing setup, inquiries and showings");
    expect(page).not.toContain("Screening, leasing and move-ins");
    expect(page).not.toContain("Tenant messages and maintenance coordination");
    expect(page).not.toMatch(/refund/i);
    expect(form).toContain('name="source"');
    expect(start).toContain("/api/owners/start");
    expect(start).toContain("...(source ? { source } : {})");
  });

  it("accepts a written availability note", () => {
    const result = validateOwnerLead({ ...base, availableFrom: "December 1" });
    expect(result.ok).toBe(true);
  });
});
