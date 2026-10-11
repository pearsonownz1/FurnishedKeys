import { locationById } from "@/lib/locations";
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
  renterPhone: string | null;
  moveIn: string;
  moveOut: string;
  occupants: number;
  pets: string | null;
  message: string;
};

export type InquiryReply = {
  to: string;
  listingTitle: string;
  body: string;
  replyTo: string;
  /** Absolute URL of /inquiry/<token>. The raw token is not stored. */
  inquiryUrl: string;
};

export type RenterMessageNotice = {
  ownerId: string;
  listingTitle: string;
  inquiryId: string;
};

export type InquiryDecline = {
  to: string;
  listingTitle: string;
  note: string | null;
};

/** Guy's address. Preview tests override this with LEADS_NOTIFY_TO. */
export const DEFAULT_LEADS_NOTIFY_TO = "guy@gcs.org";

export type OwnerLeadNotice = {
  name: string;
  email: string;
  phone: string | null;
  interest: string | null;
  propertyType: string | null;
  furnished: string | null;
  locationId: string | null;
  propertyAddress: string | null;
  currentUse: string | null;
  availableFrom: string | null;
  notes: string | null;
  source: string;
};

export type ReviewDecision = "approved" | "changes_requested" | "rejected";

export type ReviewNotice = {
  ownerId: string;
  listingTitle: string;
  decision: ReviewDecision;
  note: string | null;
  origin: string;
};

export type SendResult = { id: string | null; detail: string };

/** Sends through Resend. With no API key, logs the message and does not send. Never throws. */
export async function sendEmail(message: OutboundEmail): Promise<SendResult> {
  const to = message.to.trim();
  if (to.toLowerCase().endsWith(".example")) {
    console.info("email skipped (example domain)", {
      to,
      subject: message.subject,
      detail: "skipped:example-domain",
    });
    return { id: null, detail: "skipped:example-domain" };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.info("email skipped (no RESEND_API_KEY)", {
      to: message.to,
      subject: message.subject,
      replyTo: message.replyTo ?? null,
      html: message.html,
    });
    return { id: null, detail: "skipped:no-key" };
  }

  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    console.error("email skipped (no EMAIL_FROM)", { to: message.to, subject: message.subject });
    return { id: null, detail: "skipped:no-from" };
  }

  const payload: Record<string, unknown> = {
    from,
    to: [to],
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
      const reason = body?.message ?? "no id";
      console.error("email failed", response.status, reason);
      return { id: null, detail: `failed:${response.status}:${reason}`.slice(0, 180) };
    }
    console.info("email sent", body.id);
    return { id: body.id, detail: `sent:${body.id}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "request error";
    console.error("email failed", reason);
    return { id: null, detail: `failed:${reason}`.slice(0, 180) };
  }
}

export function inquiryNoticeHtml(input: {
  listingTitle: string;
  renterName: string;
  renterEmail: string;
  renterPhone: string | null;
  moveIn: string;
  moveOut: string;
  occupants: number;
  pets: string | null;
  message: string;
  inquiryUrl: string;
}): string {
  const pets = input.pets?.trim() ? input.pets.trim() : "None";
  const phone = input.renterPhone?.trim() ? input.renterPhone.trim() : "None";
  return layout(
    `<p style="margin:0 0 16px;">New inquiry for <strong>${escapeHtml(input.listingTitle)}</strong>.</p>` +
      field("Renter", input.renterName) +
      field("Email", input.renterEmail) +
      field("Phone", phone) +
      field("Dates", `${input.moveIn} to ${input.moveOut}`) +
      field("Occupants", String(input.occupants)) +
      field("Pets", pets) +
      field("Message", input.message) +
      `<p style="margin:24px 0 0;"><a href="${escapeHtml(input.inquiryUrl)}">View this inquiry</a></p>`,
  );
}

export function inquiryReplyHtml(body: string, inquiryUrl: string): string {
  return layout(
    `<p style="margin:0;">${escapeHtml(body).replaceAll("\n", "<br>")}</p>` +
      `<p style="margin:24px 0 0;"><a href="${escapeHtml(inquiryUrl)}">Reply to this message</a></p>`,
  );
}

export function renterMessageNoticeHtml(input: { listingTitle: string; threadUrl: string }): string {
  return layout(
    `<p style="margin:0 0 16px;">New message about <strong>${escapeHtml(input.listingTitle)}</strong>.</p>` +
      `<p style="margin:24px 0 0;"><a href="${escapeHtml(input.threadUrl)}">View the message</a></p>`,
  );
}

export function ownerLeadNoticeHtml(lead: OwnerLeadNotice): string {
  const location = lead.locationId
    ? (locationById(lead.locationId)?.name ?? lead.locationId)
    : "None";
  return layout(
    `<p style="margin:0 0 16px;">New owner lead.</p>` +
      field("Name", lead.name) +
      field("Email", lead.email) +
      field("Phone", lead.phone?.trim() || "None") +
      field("Interest", lead.interest?.trim() || "None") +
      field("Property address", lead.propertyAddress?.trim() || "None") +
      field("Property type", lead.propertyType?.trim() || "None") +
      field("Furnished", lead.furnished?.trim() || "None") +
      field("Location", location) +
      field("Current use", lead.currentUse?.trim() || "None") +
      field("Available from", lead.availableFrom?.trim() || "None") +
      field("Notes", lead.notes?.trim() || "None") +
      field("Source", lead.source?.trim() || "None"),
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
export async function deliverInquiryNotice(notice: InquiryNotice): Promise<SendResult> {
  try {
    const owner = await ownerContact(notice.ownerId);
    if (!owner.email) return { id: null, detail: owner.detail };
    if (!owner.notifyNewInquiry) return { id: null, detail: "skipped:notify-new-inquiry" };
    const origin = await siteOrigin();
    const inquiryUrl = `${origin}/owner#inquiry-${notice.inquiryId}`;
    return await sendEmail({
      to: owner.email,
      subject: `New inquiry for ${oneLine(notice.listingTitle)}`,
      html: inquiryNoticeHtml({ ...notice, inquiryUrl }),
      replyTo: notice.renterEmail,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error";
    console.error("inquiry email failed", reason);
    return { id: null, detail: `failed:${reason}`.slice(0, 180) };
  }
}

/** Emails the renter the owner's reply, including a fresh thread link. A failure is logged and swallowed. */
export async function deliverInquiryReply(reply: InquiryReply): Promise<SendResult> {
  try {
    return await sendEmail({
      to: reply.to,
      subject: `Re: your inquiry for ${oneLine(reply.listingTitle)}`,
      html: inquiryReplyHtml(reply.body, reply.inquiryUrl),
      replyTo: reply.replyTo,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error";
    console.error("inquiry reply email failed", reason);
    return { id: null, detail: `failed:${reason}`.slice(0, 180) };
  }
}

/** Emails the owner that the renter wrote back. Skipped when notify_new_message is false. */
export async function deliverRenterMessageNotice(notice: RenterMessageNotice): Promise<SendResult> {
  try {
    const owner = await ownerContact(notice.ownerId);
    if (!owner.email) return { id: null, detail: owner.detail };
    if (!owner.notifyNewMessage) return { id: null, detail: "skipped:notify-new-message" };
    const origin = await siteOrigin();
    const threadUrl = `${origin}/owner/inquiries/${notice.inquiryId}`;
    return await sendEmail({
      to: owner.email,
      subject: `New message about ${oneLine(notice.listingTitle)}`,
      html: renterMessageNoticeHtml({ listingTitle: notice.listingTitle, threadUrl }),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error";
    console.error("renter message email failed", reason);
    return { id: null, detail: `failed:${reason}`.slice(0, 180) };
  }
}

/** Sends an owner-lead alert. A failure is logged and swallowed. */
export async function deliverOwnerLeadNotice(lead: OwnerLeadNotice): Promise<SendResult> {
  const to = process.env.LEADS_NOTIFY_TO?.trim() || DEFAULT_LEADS_NOTIFY_TO;
  const interest = oneLine(lead.interest?.trim() || "unspecified");
  const address = oneLine(lead.propertyAddress?.trim() || "no address");
  try {
    return await sendEmail({
      to,
      subject: `New owner lead: ${interest} – ${address}`,
      html: ownerLeadNoticeHtml(lead),
      replyTo: lead.email,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error";
    console.error("owner lead email failed", reason);
    return { id: null, detail: `failed:${reason}`.slice(0, 180) };
  }
}

/** Emails the renter a short decline. The optional note is escaped. A failure is logged and swallowed. */
export async function deliverInquiryDecline(decline: InquiryDecline): Promise<SendResult> {
  try {
    return await sendEmail({
      to: decline.to,
      subject: `About your inquiry for ${oneLine(decline.listingTitle)}`,
      html: inquiryDeclineHtml(decline.listingTitle, decline.note),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "error";
    console.error("inquiry decline email failed", reason);
    return { id: null, detail: `failed:${reason}`.slice(0, 180) };
  }
}

export function inquiryDeclineHtml(title: string, note: string | null): string {
  const noteBlock = note?.trim()
    ? `<p style="margin:0 0 16px;">${escapeHtml(note.trim()).replaceAll("\n", "<br>")}</p>`
    : "";
  return layout(
    `<p style="margin:0 0 16px;">Thank you for asking about <strong>${escapeHtml(title)}</strong>. The owner is not able to offer this stay.</p>` +
      noteBlock,
  );
}

/** Looks up the owner and sends the review decision. Skipped when notify_listing_status is false. */
export async function deliverReviewDecision(notice: ReviewNotice): Promise<void> {
  try {
    const owner = await ownerContact(notice.ownerId);
    if (!owner.email) return;
    if (!owner.notifyListingStatus) {
      console.error("review email skipped: notify_listing_status");
      return;
    }
    const title = oneLine(notice.listingTitle);
    const subject =
      notice.decision === "approved"
        ? `Listing approved: ${title}`
        : notice.decision === "changes_requested"
          ? `Changes requested: ${title}`
          : `Listing not approved: ${title}`;
    const origin = notice.origin.replace(/\/$/, "");
    await sendEmail({
      to: owner.email,
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

async function ownerContact(ownerId: string): Promise<{
  email: string | null;
  notifyNewInquiry: boolean;
  notifyNewMessage: boolean;
  notifyListingStatus: boolean;
  detail: string;
}> {
  const off = {
    email: null as string | null,
    notifyNewInquiry: false,
    notifyNewMessage: false,
    notifyListingStatus: false,
  };
  const service = createServiceClient();
  if (!service) {
    console.error("email skipped: service client is not configured");
    return { ...off, detail: "skipped:no-service-client" };
  }
  const { data, error } = await service
    .from("profiles")
    .select("email, notify_new_inquiry, notify_new_message, notify_listing_status")
    .eq("id", ownerId)
    .maybeSingle();
  if (error) {
    console.error("email skipped: owner lookup failed", error.message);
    return { ...off, detail: `skipped:lookup:${error.message}`.slice(0, 180) };
  }
  if (!data?.email) {
    console.error("email skipped: owner has no email");
    return { ...off, detail: "skipped:no-owner-email" };
  }
  return {
    email: data.email,
    notifyNewInquiry: data.notify_new_inquiry !== false,
    notifyNewMessage: data.notify_new_message !== false,
    notifyListingStatus: data.notify_listing_status !== false,
    detail: "ok",
  };
}

export async function publicOrigin(): Promise<string> {
  return siteOrigin();
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
