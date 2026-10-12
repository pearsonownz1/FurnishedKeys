import { headers } from "next/headers";
import { publicOrigin, sendEmail } from "@/lib/email";
import { SITE_ORIGIN } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/service";

const HOUR_MS = 60 * 60 * 1000;
const EMAIL_LIMIT = 5;
const IP_LIMIT = 20;
const tokenPattern = /^[A-Za-z0-9_-]{8,200}$/;

export type PasswordResetState = {
  ok: boolean;
  success?: boolean;
  fieldErrors?: Partial<Record<"email", string>>;
};

export const PASSWORD_RESET_SENT: PasswordResetState = { ok: true, success: true };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LinkProperties = {
  hashed_token?: string | null;
  action_link?: string | null;
};

type Service = NonNullable<ReturnType<typeof createServiceClient>>;

/** Production links use the canonical site. SITE_URL overrides. Other environments use the request origin. */
export async function authLinkOrigin(): Promise<string> {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return SITE_ORIGIN;
  return publicOrigin();
}

export function authConfirmUrl(
  origin: string,
  tokenHash: string,
  type: "recovery" | "email_change",
  next: string,
): string {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  url.searchParams.set("next", next);
  return url.toString();
}

/**
 * verifyOtp's token_hash.
 * Recovery: properties.hashed_token matches the action-link token.
 * Email change: hashed_token does not verify (otp_expired). The action-link
 * `token` parameter does, with type email_change.
 */
export function verifyToken(
  properties: LinkProperties | null | undefined,
  source: "hashed" | "action",
): string | null {
  const hashed = properties?.hashed_token?.trim() ?? "";
  const action = actionLinkToken(properties?.action_link);
  const chosen = source === "hashed" ? hashed || action : action || hashed;
  return tokenPattern.test(chosen) ? chosen : null;
}

function actionLinkToken(actionLink: string | null | undefined): string {
  if (!actionLink) return "";
  try {
    return new URL(actionLink).searchParams.get("token")?.trim() ?? "";
  } catch {
    return "";
  }
}

/** Icon, wordmark, pine button, plain footer. Auth mail only. */
export function authEmailHtml(input: { intro: string; button: string; href: string }): string {
  const href = escapeAttr(input.href);
  const icon = `${SITE_ORIGIN}/email/fk-icon.png`;
  return (
    `<div style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:#1c1917;max-width:480px;">` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;border-collapse:collapse;">` +
    `<tr><td style="vertical-align:middle;padding:0 10px 0 0;line-height:0;">` +
    `<img src="${icon}" width="64" height="64" alt="Furnished Keys" style="display:block;width:64px;height:64px;border:0;border-radius:2px;" />` +
    `</td><td style="vertical-align:middle;font-size:22px;letter-spacing:-0.4px;line-height:1;">Furnished Keys</td></tr></table>` +
    `<p style="margin:0 0 24px;">${escapeText(input.intro)}</p>` +
    `<p style="margin:0 0 28px;"><a href="${href}" style="display:inline-block;background:#2e4a3b;color:#ffffff;text-decoration:none;padding:12px 20px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;">${escapeText(input.button)}</a></p>` +
    `<p style="margin:0;color:#78716c;font-size:13px;">Furnished Keys<br>${escapeText(SITE_ORIGIN)}</p>` +
    `</div>`
  );
}

export function clientIp(headerList: { get(name: string): string | null }): string {
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const real = headerList.get("x-real-ip")?.trim() ?? "";
  const ip = (forwarded || real || "unknown").slice(0, 80);
  return ip || "unknown";
}

/** Same success for a missing account, a rate limit, and a send failure. */
export async function deliverPasswordReset(formData: FormData): Promise<PasswordResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 200) {
    return { ok: false, fieldErrors: { email: "Add a valid email." } };
  }

  const service = createServiceClient();
  if (!service) {
    console.error("password reset skipped: service client is not configured");
    return PASSWORD_RESET_SENT;
  }

  const headerList = await headers();
  const ip = clientIp(headerList);
  const reserved = await reserveAuthMail(service, email, ip);
  if (reserved !== "ok") {
    console.error("password reset skipped", reserved);
    return PASSWORD_RESET_SENT;
  }

  const link = await service.auth.admin.generateLink({ type: "recovery", email });
  if (link.error || !link.data.properties) {
    console.error("password reset skipped", link.error?.code ?? link.error?.message ?? "no link");
    return PASSWORD_RESET_SENT;
  }
  const token = verifyToken(link.data.properties, "hashed");
  if (!token) {
    console.error("password reset skipped", "no token");
    return PASSWORD_RESET_SENT;
  }

  const origin = await authLinkOrigin();
  const href = authConfirmUrl(origin, token, "recovery", "/reset-password");
  try {
    await sendEmail({
      to: email,
      subject: "Reset your Furnished Keys password",
      html: authEmailHtml({
        intro: "Choose a new password for your Furnished Keys account.",
        button: "Reset password",
        href,
      }),
    });
  } catch (error) {
    console.error("password reset email failed", error instanceof Error ? error.message : "error");
  }
  return PASSWORD_RESET_SENT;
}

export type EmailChangeResult = {
  ok: boolean;
  success?: boolean;
  formError?: string;
  fieldErrors?: Partial<Record<"email", string>>;
  message?: string;
};

const EMAIL_CHANGE_MESSAGE = "Check your inbox to confirm the new email.";
const EMAIL_CHANGE_FAILURE = "We couldn't update your email. Please try again.";

/**
 * Secure email change is on for this project. Verifying only the new address
 * leaves the old email in place and sets a pending new email. Both links are
 * required. Each uses type email_change and the action-link token.
 */
export async function deliverEmailChange(input: {
  currentEmail: string;
  newEmail: string;
}): Promise<EmailChangeResult> {
  const currentEmail = input.currentEmail.trim().toLowerCase();
  const newEmail = input.newEmail.trim().toLowerCase();
  if (!emailPattern.test(newEmail) || newEmail.length > 200) {
    return { ok: false, fieldErrors: { email: "Add a valid email." } };
  }
  if (newEmail === currentEmail) {
    return { ok: false, fieldErrors: { email: "Add a different email." } };
  }

  const service = createServiceClient();
  if (!service) {
    console.error("email change skipped: service client is not configured");
    return { ok: false, formError: EMAIL_CHANGE_FAILURE };
  }

  const fresh = await service.auth.admin.generateLink({
    type: "email_change_new",
    email: currentEmail,
    newEmail,
  });
  const current = await service.auth.admin.generateLink({
    type: "email_change_current",
    email: currentEmail,
    newEmail,
  });
  const newToken = verifyToken(fresh.data?.properties, "action");
  const currentToken = verifyToken(current.data?.properties, "action");
  if (fresh.error || !newToken || current.error || !currentToken) {
    console.error(
      "email change skipped",
      fresh.error?.code ?? current.error?.code ?? "no token",
    );
    return { ok: false, formError: EMAIL_CHANGE_FAILURE };
  }

  const origin = await authLinkOrigin();
  const newHref = authConfirmUrl(origin, newToken, "email_change", "/owner/settings");
  const currentHref = authConfirmUrl(origin, currentToken, "email_change", "/owner/settings");
  const sentNew = await sendEmail({
    to: newEmail,
    subject: "Confirm your new Furnished Keys email",
    html: authEmailHtml({
      intro: "Confirm this address for your Furnished Keys account.",
      button: "Confirm email",
      href: newHref,
    }),
  });
  const sentCurrent = await sendEmail({
    to: currentEmail,
    subject: "Confirm an email change on Furnished Keys",
    html: authEmailHtml({
      intro: "Confirm that you want to change the email on your Furnished Keys account.",
      button: "Confirm email change",
      href: currentHref,
    }),
  });
  if (!sentNew.id || !sentCurrent.id) {
    console.error("email change skipped", sentNew.detail, sentCurrent.detail);
    return { ok: false, formError: EMAIL_CHANGE_FAILURE };
  }
  return { ok: true, success: true, message: EMAIL_CHANGE_MESSAGE };
}

async function reserveAuthMail(
  service: Service,
  email: string,
  ip: string,
): Promise<"ok" | "limited" | "unavailable"> {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const [emailCount, ipCount] = await Promise.all([
    countBucket(service, "email", email, since),
    countBucket(service, "ip", ip, since),
  ]);
  if (emailCount == null || ipCount == null) return "unavailable";
  if (emailCount >= EMAIL_LIMIT || ipCount >= IP_LIMIT) return "limited";
  const inserted = await service.from("auth_mail_attempts").insert([
    { bucket: "email", subject: email },
    { bucket: "ip", subject: ip },
  ]);
  if (inserted.error) {
    console.error("password reset count failed", inserted.error.message);
    return "unavailable";
  }
  return "ok";
}

async function countBucket(
  service: Service,
  bucket: "email" | "ip",
  subject: string,
  since: string,
): Promise<number | null> {
  const counted = await service
    .from("auth_mail_attempts")
    .select("id", { count: "exact", head: true })
    .eq("bucket", bucket)
    .eq("subject", subject)
    .gte("created_at", since);
  if (counted.error) {
    console.error("password reset count failed", counted.error.message);
    return null;
  }
  return counted.count ?? 0;
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;");
}
