import { createServiceClient } from "@/lib/supabase/service";

const RESEND_URL = "https://api.resend.com/emails";
const SITE_FALLBACK = "https://furnishedkeys.com";

export type OutboundEmail = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type InquiryNotice = {
  ownerId: string;
  listingTitle: string;
  inquiryId: string;
  renterName: string;
  renterEmail: string;
  moveIn: string;
  moveOut: string;
  occupants: number;
  pets: string | null;
  message: string;
};

export type ReviewDecision = "approved" | "changes_requested" | "rejected";

export type ReviewNotice = {
  ownerId: string;
  listingTitle: string;
  decision: ReviewDecision;
  note: string | null;
  origin: string;
};

/** Sends through Resend. With no API key, logs the message and does not send. Never throws. */
export async function sendEmail(message: OutboundEmail): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info("email skipped (no RESEND_API_KEY)", {
      to: message.to,
      subject: message.subject,
      replyTo: message.replyTo ?? null,
      html: message.html,
    });
    return { id: null };
  }

  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    console.error("email skipped (no EMAIL_FROM)", { to: message.to, subject: message.subject });
    return { id: null };
  }

  const payload: Record<string, unknown> = {
    from,
    to: [message.to],
    subject: message.subject,
    html: message.html,
  };
  if (message.replyTo) payload.reply_to = message.replyTo;

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!response.ok || !body?.id) {
      console.error("email failed", response.status, body?.message ?? "no id");
      return { id: null };
    }
    console.info("email sent", body.id);
    return { id: body.id };
  } catch (error) {
    console.error("email failed", error instanceof Error ? error.message : "request error");
    return { id: null };
  }
}

export function inquiryNoticeHtml(input: {
  listingTitle: string;
  renterName: string;
  moveIn: string;
  moveOut: string;
  occupants: number;
  pets: string | null;
  message: string;
  inquiryUrl: string;
}): string {
  const pets = input.pets?.trim() ? input.pets.trim() : "None";
  return layout(
    `<p style="margin:0 0 16px;">New inquiry for <strong>${escapeHtml(input.listingTitle)}</strong>.</p>` +
      field("Renter", input.renterName) +
      field("Dates", `${input.moveIn} to ${input.moveOut}`) +
      field("Occupants", String(input.occupants)) +
      field("Pets", pets) +
      field("Message", input.message) +
      `<p style="margin:24px 0 0;"><a href="${escapeHtml(input.inquiryUrl)}">View this inquiry</a></p>`,
  );
}

export function reviewNoticeHtml(input: {
  listingTitle: string;
  decision: ReviewDecision;
  note: string | null;
  dashboardUrl: string;
}): string {
  const title = escapeHtml(input.listingTitle);
  const lead =
    input.decision === "approved"
      ? `<strong>${title}</strong> is approved and can appear in the catalog.`
      : input.decision === "changes_requested"
        ? `Changes were requested for <strong>${title}</strong>.`
        : `<strong>${title}</strong> was not approved.`;
  const note = input.note?.trim() ? field("Note", input.note.trim()) : "";
  return layout(
    `<p style="margin:0 0 16px;">${lead}</p>` +
      note +
      `<p style="margin:24px 0 0;"><a href="${escapeHtml(input.dashboardUrl)}">Open your dashboard</a></p>`,
  );
}

/** Looks up the owner and sends the inquiry notice. A failure is logged and swallowed. */
export async function deliverInquiryNotice(notice: InquiryNotice): Promise<void> {
  try {
    const to = await ownerEmail(notice.ownerId);
    if (!to) return;
    const origin = await siteOrigin();
    const inquiryUrl = `${origin}/owner#inquiry-${notice.inquiryId}`;
    await sendEmail({
      to,
      subject: `New inquiry for ${oneLine(notice.listingTitle)}`,
      html: inquiryNoticeHtml({ ...notice, inquiryUrl }),
      replyTo: notice.renterEmail,
    });
  } catch (error) {
    console.error("inquiry email failed", error instanceof Error ? error.message : "error");
  }
}

/** Looks up the owner and sends the review decision. A failure is logged and swallowed. */
export async function deliverReviewDecision(notice: ReviewNotice): Promise<void> {
  try {
    const to = await ownerEmail(notice.ownerId);
    if (!to) return;
    const title = oneLine(notice.listingTitle);
    const subject =
      notice.decision === "approved"
        ? `Listing approved: ${title}`
        : notice.decision === "changes_requested"
          ? `Changes requested: ${title}`
          : `Listing not approved: ${title}`;
    const origin = notice.origin.replace(/\/$/, "");
    await sendEmail({
      to,
      subject,
      html: reviewNoticeHtml({
        listingTitle: notice.listingTitle,
        decision: notice.decision,
        note: notice.note,
        dashboardUrl: `${origin}/owner`,
      }),
    });
  } catch (error) {
    console.error("review email failed", error instanceof Error ? error.message : "error");
  }
}

async function ownerEmail(ownerId: string): Promise<string | null> {
  const service = createServiceClient();
  if (!service) {
    console.error("email skipped: service client is not configured");
    return null;
  }
  const { data, error } = await service
    .from("profiles")
    .select("email")
    .eq("id", ownerId)
    .maybeSingle();
  if (error) {
    console.error("email skipped: owner lookup failed", error.message);
    return null;
  }
  if (!data?.email) {
    console.error("email skipped: owner has no email");
    return null;
  }
  return data.email;
}

async function siteOrigin(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const list = await headers();
    const host = list.get("x-forwarded-host")?.split(",")[0]?.trim() || list.get("host")?.trim();
    const proto = list.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host) && (proto === "https" || proto === "http")) {
      return `${proto}://${host}`;
    }
  } catch (error) {
    console.error("email origin fallback", error instanceof Error ? error.message : "headers");
  }
  return SITE_FALLBACK;
}

function layout(body: string): string {
  return (
    `<div style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.5; color: #1c1917;">` +
    body +
    `</div>`
  );
}

function field(label: string, value: string): string {
  return (
    `<p style="margin:0 0 12px;"><strong>${escapeHtml(label)}</strong><br>` +
    `${escapeHtml(value).replaceAll("\n", "<br>")}</p>`
  );
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function oneLine(value: string): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed || "Your listing";
}
