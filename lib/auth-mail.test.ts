import { beforeEach, describe, expect, it, vi } from "vitest";
import { changeEmail } from "@/app/(site)/owner/settings-actions";
import { requestPasswordReset } from "@/app/(site)/forgot-password/actions";
import { sessionUser } from "@/lib/api/owner-listing";
import { authConfirmUrl, authEmailHtml, verifyToken } from "@/lib/auth-mail";
import { sendEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.8" })),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  publicOrigin: vi.fn(async () => "https://preview.example"),
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/api/owner-listing", () => ({
  sessionUser: vi.fn(),
}));

const hashed = "recoveryHashToken_12";
const actionToken = "emailChangeToken_34";

function form(email: string) {
  const data = new FormData();
  data.set("email", email);
  return data;
}

function service(options: {
  emailCount?: number;
  ipCount?: number;
  link?: { data: unknown; error: { code?: string; message?: string } | null };
  links?: Record<string, { data: unknown; error: { code?: string; message?: string } | null }>;
}) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const generateLink = vi.fn(async (params: { type: string }) => {
    if (options.links?.[params.type]) return options.links[params.type];
    return (
      options.link ?? {
        data: { properties: { hashed_token: hashed, action_link: `https://example.test/verify?token=${hashed}&type=recovery` } },
        error: null,
      }
    );
  });
  vi.mocked(createServiceClient).mockReturnValue({
    auth: { admin: { generateLink } },
    from() {
      return {
        select: () => ({
          eq: (_column: string, bucket: string) => ({
            eq: () => ({
              gte: vi.fn().mockResolvedValue({
                count: bucket === "email" ? (options.emailCount ?? 0) : (options.ipCount ?? 0),
                error: null,
              }),
            }),
          }),
        }),
        insert,
      };
    },
  } as unknown as ReturnType<typeof createServiceClient>);
  return { generateLink, insert };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SITE_URL", "https://www.furnishedkeys.com");
  vi.mocked(sendEmail).mockResolvedValue({ id: "re_auth", detail: "sent:re_auth" });
});

describe("requestPasswordReset", () => {
  it("returns the same success when the account is missing and when it exists", async () => {
    const missing = service({
      link: { data: { properties: null }, error: { code: "user_not_found", message: "User not found" } },
    });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const absent = await requestPasswordReset({ ok: false }, form("missing@example.com"));
    expect(absent).toEqual({ ok: true, success: true });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(missing.generateLink).toHaveBeenCalledWith({
      type: "recovery",
      email: "missing@example.com",
    });

    service({ emailCount: 0, ipCount: 0 });
    const present = await requestPasswordReset({ ok: false }, form("Owner@Example.com"));
    expect(present).toEqual(absent);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const message = vi.mocked(sendEmail).mock.calls[0]?.[0];
    expect(message?.to).toBe("owner@example.com");
    expect(message?.subject).toBe("Reset your Furnished Keys password");
    const href = authConfirmUrl("https://www.furnishedkeys.com", hashed, "recovery", "/reset-password");
    expect(message?.html).toContain(href.replaceAll("&", "&amp;"));
    expect(message?.html).toContain("Furnished Keys");
    expect(message?.html).toContain("#2e4a3b");
    expect(message?.html).not.toContain("supabase.co");
    logged.mockRestore();
  });

  it("stops at five requests for one email and twenty for one IP", async () => {
    const byEmail = service({ emailCount: 5, ipCount: 0 });
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await requestPasswordReset({ ok: false }, form("owner@example.com"))).toEqual({
      ok: true,
      success: true,
    });
    expect(byEmail.generateLink).not.toHaveBeenCalled();
    expect(byEmail.insert).not.toHaveBeenCalled();

    const byIp = service({ emailCount: 0, ipCount: 20 });
    expect(await requestPasswordReset({ ok: false }, form("other@example.com"))).toEqual({
      ok: true,
      success: true,
    });
    expect(byIp.generateLink).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    logged.mockRestore();
  });

  it("rejects a malformed email before looking anyone up", async () => {
    service({});
    expect(await requestPasswordReset({ ok: false }, form("not-an-email"))).toEqual({
      ok: false,
      fieldErrors: { email: "Add a valid email." },
    });
    expect(createServiceClient).not.toHaveBeenCalled();
  });
});

describe("changeEmail", () => {
  it("emails both addresses with email_change links and keeps the success message", async () => {
    const newAction = `https://project.supabase.co/auth/v1/verify?token=${actionToken}&type=email_change`;
    const currentAction = `https://project.supabase.co/auth/v1/verify?token=currentToken_99&type=email_change`;
    service({
      links: {
        email_change_new: {
          data: {
            properties: {
              hashed_token: "not-the-verify-token",
              action_link: newAction,
              verification_type: "email_change_new",
            },
          },
          error: null,
        },
        email_change_current: {
          data: {
            properties: {
              hashed_token: "also-not-the-verify-token",
              action_link: currentAction,
              verification_type: "email_change_current",
            },
          },
          error: null,
        },
      },
    });
    vi.mocked(sessionUser).mockResolvedValue({
      supabase: {} as Awaited<ReturnType<typeof sessionUser>>["supabase"],
      user: { id: "user", email: "owner@example.com" } as NonNullable<
        Awaited<ReturnType<typeof sessionUser>>["user"]
      >,
    });

    const result = await changeEmail({ ok: false }, form("next@example.com"));

    expect(result).toEqual({
      ok: true,
      success: true,
      message: "Check your inbox to confirm the new email.",
    });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const first = vi.mocked(sendEmail).mock.calls[0]?.[0];
    const second = vi.mocked(sendEmail).mock.calls[1]?.[0];
    expect(first?.to).toBe("next@example.com");
    expect(first?.subject).toBe("Confirm your new Furnished Keys email");
    expect(first?.html).toContain(
      authConfirmUrl(
        "https://www.furnishedkeys.com",
        actionToken,
        "email_change",
        "/owner/settings",
      ).replaceAll("&", "&amp;"),
    );
    expect(first?.html).not.toContain("not-the-verify-token");
    expect(second?.to).toBe("owner@example.com");
    expect(second?.subject).toBe("Confirm an email change on Furnished Keys");
    expect(second?.html).toContain("token_hash=currentToken_99");
    expect(second?.html).toContain("type=email_change");
  });
});

describe("auth mail helpers", () => {
  it("builds the continue link and prefers the action token for email change", () => {
    expect(authConfirmUrl("https://www.furnishedkeys.com", hashed, "recovery", "/reset-password")).toBe(
      "https://www.furnishedkeys.com/auth/confirm?token_hash=recoveryHashToken_12&type=recovery&next=%2Freset-password",
    );
    expect(
      verifyToken(
        { hashed_token: "not-the-verify-token", action_link: `https://example.test/v?token=${actionToken}` },
        "action",
      ),
    ).toBe(actionToken);
    expect(verifyToken({ hashed_token: hashed, action_link: null }, "hashed")).toBe(hashed);
    expect(authEmailHtml({ intro: "Hello", button: "Reset password", href: "https://www.furnishedkeys.com/auth/confirm" })).toContain(
      "background:#2e4a3b",
    );
  });

  it("keeps signup on the confirmed admin path", async () => {
    const { readFileSync } = await import("node:fs");
    const start = readFileSync("app/api/owners/start/route.ts", "utf8");
    const signup = readFileSync("components/auth/signup-form.tsx", "utf8");
    expect(start).toContain("email_confirm: true");
    expect(start).toContain("createUser");
    expect(start).not.toContain(".signUp(");
    expect(signup).not.toContain(".signUp(");
    expect(signup).not.toContain("signInWithOtp");
    expect(readFileSync("components/auth/forgot-password-form.tsx", "utf8")).not.toContain(
      "resetPasswordForEmail",
    );
    expect(readFileSync("app/(site)/owner/settings-actions.ts", "utf8")).not.toContain("updateUser({ email");
  });
});
