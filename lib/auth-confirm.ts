import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/auth-redirect";

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

export function isOtpType(value: string | null | undefined): value is EmailOtpType {
  return value != null && otpTypes.has(value as EmailOtpType);
}

export type OtpLink = { tokenHash: string; type: EmailOtpType; next: string };

/** The one-time token from an email link, or null when it is missing or malformed. */
export function readOtpLink(get: (key: string) => string | null | undefined): OtpLink | null {
  const tokenHash = get("token_hash")?.trim();
  const type = get("type");
  if (!tokenHash || !/^[A-Za-z0-9_-]{8,200}$/.test(tokenHash) || !isOtpType(type)) return null;
  return { tokenHash, type, next: safeNext(get("next")) };
}

/** Where a verified link goes: recovery always picks a password, others follow next. */
export function destinationFor(link: Pick<OtpLink, "type" | "next">): string {
  return link.type === "recovery" ? "/reset-password" : link.next;
}

/** Where a failed link goes. */
export function failureFor(type: string | null | undefined, next: string): string {
  if (type === "recovery") return "/forgot-password?error=link";
  return `/sign-in?error=link&next=${encodeURIComponent(next)}`;
}

/** The interstitial page that asks for a click before the token is spent. */
export function continuePath(link: OtpLink): string {
  const params = new URLSearchParams({
    token_hash: link.tokenHash,
    type: link.type,
    next: link.next,
  });
  return `/auth/continue?${params.toString()}`;
}
