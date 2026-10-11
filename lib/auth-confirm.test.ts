import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/auth/confirm/route";
import { createClient } from "@/lib/supabase/server";
import { continuePath, destinationFor, failureFor, readOtpLink } from "./auth-confirm";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

const from = (q: string) => {
  const p = new URLSearchParams(q);
  return (key: string) => p.get(key);
};

describe("readOtpLink", () => {
  it("reads a recovery link", () => {
    expect(readOtpLink(from("token_hash=abc123def456&type=recovery&next=/reset-password"))).toEqual({
      tokenHash: "abc123def456",
      type: "recovery",
      next: "/reset-password",
    });
  });

  it("rejects missing or unknown parts", () => {
    expect(readOtpLink(from("type=recovery"))).toBeNull();
    expect(readOtpLink(from("token_hash=abc123def456&type=sms"))).toBeNull();
    expect(readOtpLink(from("token_hash=abc123def456&amp;type=recovery"))).toBeNull();
    expect(readOtpLink(from("token_hash=<script>&type=recovery"))).toBeNull();
  });

  it("drops an off-site next", () => {
    expect(readOtpLink(from("token_hash=abc123def456&type=signup&next=https://evil.example"))?.next).toBe(
      "/owner",
    );
  });
});

describe("confirm routing", () => {
  it("sends recovery to the password page and failures to the right notice", () => {
    expect(destinationFor({ type: "recovery", next: "/owner" })).toBe("/reset-password");
    expect(destinationFor({ type: "signup", next: "/owner/listings" })).toBe("/owner/listings");
    expect(failureFor("recovery", "/owner")).toBe("/forgot-password?error=link");
    expect(failureFor("signup", "/owner")).toBe("/sign-in?error=link&next=%2Fowner");
  });

  it("builds the continue page link without spending the token", () => {
    expect(
      continuePath({ tokenHash: "abc123def456", type: "recovery", next: "/reset-password" }),
    ).toBe("/auth/continue?token_hash=abc123def456&type=recovery&next=%2Freset-password");
  });
});

describe("GET and POST /auth/confirm", () => {
  const verifyOtp = vi.fn();
  const exchangeCodeForSession = vi.fn();
  const token = "abc123def456";
  const confirmUrl = `https://furnishedkeys.com/auth/confirm?token_hash=${token}&type=recovery&next=/reset-password`;

  beforeEach(() => {
    verifyOtp.mockReset();
    exchangeCodeForSession.mockReset();
    const used = new Set<string>();
    verifyOtp.mockImplementation(async ({ token_hash }: { token_hash: string }) => {
      if (used.has(token_hash)) {
        return { data: { session: null, user: null }, error: { message: "otp expired", code: "otp_expired" } };
      }
      used.add(token_hash);
      return { data: { session: { access_token: "session" }, user: { id: "user" } }, error: null };
    });
    vi.mocked(createClient).mockReset();
    vi.mocked(createClient).mockResolvedValue({
      auth: { verifyOtp, exchangeCodeForSession },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
  });

  function postConfirm() {
    const body = new FormData();
    body.set("token_hash", token);
    body.set("type", "recovery");
    body.set("next", "/reset-password");
    return POST(new Request("https://furnishedkeys.com/auth/confirm", { method: "POST", body }));
  }

  it("leaves the token unused across two GETs", async () => {
    const first = await GET(new Request(confirmUrl));
    const second = await GET(new Request(confirmUrl));

    expect(first.status).toBe(303);
    expect(second.status).toBe(303);
    expect(first.headers.get("location")).toBe(
      "https://furnishedkeys.com/auth/continue?token_hash=abc123def456&type=recovery&next=%2Freset-password",
    );
    expect(second.headers.get("location")).toBe(first.headers.get("location"));
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(createClient).not.toHaveBeenCalled();
  });

  it("verifies on the first POST and rejects the same token the second time", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ok = await postConfirm();
    const again = await postConfirm();

    expect(ok.status).toBe(303);
    expect(ok.headers.get("location")).toBe("https://furnishedkeys.com/reset-password");
    expect(again.status).toBe(303);
    expect(again.headers.get("location")).toBe("https://furnishedkeys.com/forgot-password?error=link");
    expect(verifyOtp).toHaveBeenCalledTimes(2);
    expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: token });
  });

  it("still exchanges a PKCE code on GET", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: {} }, error: null });
    const response = await GET(
      new Request("https://furnishedkeys.com/auth/confirm?code=pkce-code&type=recovery"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://furnishedkeys.com/reset-password");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(verifyOtp).not.toHaveBeenCalled();
  });
});
