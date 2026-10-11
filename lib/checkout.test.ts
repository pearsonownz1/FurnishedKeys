import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
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

  it("formats a paid-through date for server responses", () => {
    expect(paidThroughMonthYear("2027-10-11T00:00:00.000Z")).toBe("Paid through Oct 2027");
  });

  it("leaves checkout on the server and keeps it out of the UI", () => {
    const route = readFileSync("app/api/listings/[id]/checkout/route.ts", "utf8");
    expect(route).not.toContain("branding_settings");
    expect(route).not.toContain("appearance");
    const walk = (current: string): string[] =>
      readdirSync(current).flatMap((entry) => {
        const path = join(current, entry);
        return statSync(path).isDirectory() ? walk(path) : path.endsWith(".tsx") ? [path] : [];
      });
    const hits = ["app", "components"].flatMap(walk).filter((file) => {
      const source = readFileSync(file, "utf8");
      return /loadStripe|checkout-panel|stripe-embed|\/checkout|cancel-renewal|\/waive/.test(source);
    });
    expect(hits).toEqual([]);
  });
});
