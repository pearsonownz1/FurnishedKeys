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

  it("signs in with a password and confirms recovery with the cookie client", () => {
    const form = readFileSync("components/auth/sign-in-form.tsx", "utf8");
    const forgot = readFileSync("components/auth/forgot-password-form.tsx", "utf8");
    const reset = readFileSync("components/auth/reset-password-form.tsx", "utf8");
    const confirm = readFileSync("app/auth/confirm/route.ts", "utf8");
    const header = readFileSync("components/site-header.tsx", "utf8");
    const start = readFileSync("components/listing/start-form.tsx", "utf8");
    expect(form).toContain("signInWithPassword");
    expect(form).not.toContain("signInWithOtp");
    expect(form).toContain('method="post"');
    expect(form).toContain("disabled={!hydrated || pending}");
    expect(form).toContain("Forgot password?");
    expect(form).toContain("Email or password is incorrect.");
    expect(forgot).toContain("resetPasswordForEmail");
    expect(forgot).toContain("/auth/confirm?next=/reset-password");
    expect(forgot).toContain("Check your email");
    expect(forgot).toContain('method="post"');
    expect(reset).toContain("updateUser({ password })");
    expect(reset).toContain('href="/forgot-password"');
    expect(reset).toContain('method="post"');
    expect(confirm).toContain("verifyOtp");
    expect(confirm).toContain("exchangeCodeForSession");
    expect(confirm).toContain('"recovery"');
    expect(confirm).toContain('"/reset-password"');
    expect(confirm).toContain("createClient");
    expect(header).toContain('href: "/sign-in", label: "Sign in"');
    expect(header).toContain("Save and exit");
    expect(start).toContain("password");
    expect(start).toContain('autoComplete="new-password"');
    expect(start).toContain('method="post"');
    expect(start).toContain("/sign-in?next=%2Fowners%2Fstart");
  });
});
