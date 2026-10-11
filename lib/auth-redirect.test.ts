import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dashboardForRole, requestedNext, safeNext } from "./auth-redirect";

describe("safeNext", () => {
  it("keeps a relative path and drops off-site targets", () => {
    expect(safeNext("/owner")).toBe("/owner");
    expect(safeNext("/admin/listings/abc?step=1")).toBe("/admin/listings/abc?step=1");
    expect(safeNext("/signup?src=letter")).toBe("/signup?src=letter");
    expect(safeNext(null)).toBe("/owner");
    expect(safeNext("")).toBe("/owner");
    expect(safeNext("//evil.example/phish")).toBe("/owner");
    expect(safeNext("https://evil.example/owner")).toBe("/owner");
    expect(safeNext("/\\evil.example")).toBe("/owner");
  });

  it("uses a safe next only when one was given, otherwise the role dashboard", () => {
    expect(requestedNext(null)).toBeNull();
    expect(requestedNext("")).toBeNull();
    expect(requestedNext("https://evil.example/owner")).toBeNull();
    expect(requestedNext("/owner?tab=drafts")).toBe("/owner?tab=drafts");
    expect(dashboardForRole("admin")).toBe("/admin/listings");
    expect(dashboardForRole("owner")).toBe("/owner");
    expect(dashboardForRole("renter")).toBe("/owner");
    expect(dashboardForRole(null)).toBe("/owner");
  });

  it("signs in with a password and confirms recovery with the cookie client", () => {
    const form = readFileSync("components/auth/sign-in-form.tsx", "utf8");
    const forgot = readFileSync("components/auth/forgot-password-form.tsx", "utf8");
    const reset = readFileSync("components/auth/reset-password-form.tsx", "utf8");
    const confirm = readFileSync("app/auth/confirm/route.ts", "utf8");
    const header = readFileSync("components/site-header.tsx", "utf8");
    const signup = readFileSync("components/auth/signup-form.tsx", "utf8");
    const signOut = readFileSync("app/sign-out/route.ts", "utf8");
    expect(form).toContain("signInWithPassword");
    expect(form).not.toContain("signInWithOtp");
    expect(form).toContain('method="post"');
    expect(form).toContain("disabled={!hydrated || pending}");
    expect(form).toContain("Forgot password?");
    expect(form).toContain("Create an account");
    expect(form).toContain("Wrong email or password");
    expect(form).toContain("dashboardForRole");
    expect(forgot).toContain("resetPasswordForEmail");
    expect(forgot).toContain("/auth/confirm?next=/reset-password");
    expect(forgot).toContain("If that email has an account, we sent a reset link.");
    expect(forgot).not.toContain("Check your email");
    expect(forgot).toContain('method="post"');
    expect(reset).toContain("updateUser({ password })");
    expect(reset).toContain("dashboardForRole");
    expect(reset).toContain("Password needs at least 8 characters");
    expect(reset).toContain('href="/forgot-password"');
    expect(reset).toContain('method="post"');
    expect(confirm).toContain("verifyOtp");
    expect(confirm).toContain("exchangeCodeForSession");
    expect(confirm).toContain('"recovery"');
    expect(confirm).toContain('"/reset-password"');
    expect(confirm).toContain("createClient");
    expect(header).toContain('href: "/sign-in", label: "Sign in"');
    expect(header).toContain("Save and exit");
    expect(header).toContain("My listings");
    expect(header).toContain("Admin");
    expect(header).toContain('action="/sign-out"');
    expect(header).toContain('method="post"');
    expect(header).toContain('href="/signup"');
    expect(header).not.toContain('href="/list"');
    expect(signOut).toContain("signOut");
    expect(signup).toContain("password");
    expect(signup).toContain('autoComplete="new-password"');
    expect(signup).toContain('method="post"');
    expect(signup).toContain("Create account");
    expect(signup).toContain("Already have an account?");
    expect(signup).toContain("That email already has an account, sign in instead");
    expect(signup).toContain("Password needs at least 8 characters");
    expect(signup).toContain('href="/sign-in"');
    expect(signup).not.toContain("signInWithOtp");
  });
});
