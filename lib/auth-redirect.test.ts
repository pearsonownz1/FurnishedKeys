import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { safeNext } from "./auth-redirect";

describe("safeNext", () => {
  it("keeps a relative path and drops off-site targets", () => {
    expect(safeNext("/owner")).toBe("/owner");
    expect(safeNext("/admin/listings/abc?step=1")).toBe("/admin/listings/abc?step=1");
    expect(safeNext("/owners/start?src=letter")).toBe("/owners/start?src=letter");
    expect(safeNext(null)).toBe("/owner");
    expect(safeNext("")).toBe("/owner");
    expect(safeNext("//evil.example/phish")).toBe("/owner");
    expect(safeNext("https://evil.example/owner")).toBe("/owner");
    expect(safeNext("/\\evil.example")).toBe("/owner");
  });

  it("sends a magic link and confirms it with the cookie client", () => {
    const form = readFileSync("components/auth/sign-in-form.tsx", "utf8");
    const confirm = readFileSync("app/auth/confirm/route.ts", "utf8");
    const header = readFileSync("components/site-header.tsx", "utf8");
    const start = readFileSync("components/listing/start-form.tsx", "utf8");
    expect(form).toContain("signInWithOtp");
    expect(form).toContain("shouldCreateUser: false");
    expect(form).toContain("emailRedirectTo");
    expect(form).toContain("/auth/confirm?next=");
    expect(form).toContain("Check your email");
    expect(confirm).toContain("verifyOtp");
    expect(confirm).toContain("exchangeCodeForSession");
    expect(confirm).toContain('"magiclink"');
    expect(confirm).toContain('"signup"');
    expect(confirm).toContain("createClient");
    expect(header).toContain('href: "/sign-in", label: "Sign in"');
    expect(header).toContain("Save and exit");
    expect(start).toContain("/sign-in?next=%2Fowners%2Fstart");
  });
});
