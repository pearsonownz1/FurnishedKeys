import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { paidThroughMonthYear, parseCheckoutPost, parseCheckoutStatus } from "./checkout";

describe("checkout response", () => {
  it("accepts a waived placeholder and a client secret as different branches", () => {
    const waived = parseCheckoutPost({
      waived: true,
      paid_through: "2027-10-11T00:00:00.000Z",
    });
    const secret = parseCheckoutPost({ client_secret: "cs_test_secret" });

    expect(waived).toEqual({ waived: true, paid_through: "2027-10-11T00:00:00.000Z" });
    expect(secret).toEqual({ client_secret: "cs_test_secret" });
    if (waived && "waived" in waived) {
      expect(waived.paid_through).toContain("2027");
    }
    if (secret && "client_secret" in secret) {
      expect(secret.client_secret).toBe("cs_test_secret");
    }
  });

  it("rejects an error body and a waived payload without a date", () => {
    expect(parseCheckoutPost({ error: "Payments are not set up yet" })).toBeNull();
    expect(parseCheckoutPost({ waived: true })).toBeNull();
    expect(parseCheckoutPost(null)).toBeNull();
  });

  it("types the status read, including a waived listing", () => {
    expect(
      parseCheckoutStatus({ status: "waived", paid_through: "2027-10-11T00:00:00.000Z" }),
    ).toEqual({ status: "waived", paid_through: "2027-10-11T00:00:00.000Z" });
    expect(parseCheckoutStatus({ status: "paid", paid_through: null })).toEqual({
      status: "paid",
      paid_through: null,
    });
    expect(parseCheckoutStatus({ status: "waived" })).toBeNull();
  });

  it("formats the setup pill as month and year", () => {
    expect(paidThroughMonthYear("2027-10-11T00:00:00.000Z")).toBe("Paid through Oct 2027");
  });

  it("keeps Process payment on our page and mounts Stripe only with a secret and key", () => {
    const source = readFileSync("components/listing/checkout-panel.tsx", "utf8");
    const embed = readFileSync("components/listing/stripe-embed.tsx", "utf8");
    const route = readFileSync("app/api/listings/[id]/checkout/route.ts", "utf8");
    expect(source).toContain("parseCheckoutPost");
    expect(source).toContain("Process payment");
    expect(source).toContain("Renew automatically each year");
    expect(source).toContain("Order summary");
    expect(source).toContain("paid_through");
    expect(source).toContain("clientSecret && publishableKey");
    expect(source).toContain("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
    expect(embed).toContain("loadStripe");
    expect(source).not.toContain("loadStripe");
    expect(source).not.toContain("Payments are being set up");
    expect(source).not.toContain("Payments coming soon");
    expect(source).not.toContain("appearance");
    expect(source).not.toContain("branding_settings");
    expect(route).not.toContain("branding_settings");
    expect(route).not.toContain("appearance");
    expect(source).not.toMatch(/refund/i);
    expect(source).not.toContain("STRIPE_SECRET_KEY");
  });
});
