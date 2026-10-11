"use server";

import { revalidatePath } from "next/cache";
import { deliverRenterMessageNotice } from "@/lib/email";
import { hashRenterToken } from "@/lib/renter-token";
import { createServiceClient } from "@/lib/supabase/service";

export type RenterReplyState = {
  ok: boolean;
  success?: boolean;
  formError?: string;
};

export const RENTER_EXPIRED = "This link has expired. Open the newest email from the owner.";
export const RENTER_BODY = "Write a reply between 1 and 8000 characters.";
export const RENTER_LIMIT = "Please wait before sending another message.";
export const RENTER_SEND = "We couldn't send this. Please try again.";

const HOUR_MS = 60 * 60 * 1000;
const HOUR_LIMIT = 20;

/**
 * Renter reply from `/inquiry/[token]`.
 * formData: `token` (raw link token), `body` trimmed 1–8000.
 * Verifies sha256(token) against `inquiries.renter_token_hash` with the service role.
 */
export async function renterReply(
  _previous: RenterReplyState,
  formData: FormData,
): Promise<RenterReplyState> {
  const token = String(formData.get("token") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!token) return { ok: false, formError: RENTER_EXPIRED };
  if (body.length < 1 || body.length > 8000) return { ok: false, formError: RENTER_BODY };

  const service = createServiceClient();
  if (!service) {
    console.error("renter reply skipped: service client is not configured");
    return { ok: false, formError: RENTER_SEND };
  }

  const hash = hashRenterToken(token);
  const inquiry = await service
    .from("inquiries")
    .select("id, listing_id, owner_unread")
    .eq("renter_token_hash", hash)
    .maybeSingle();
  if (inquiry.error) {
    console.error("renter reply load failed", inquiry.error.message);
    return { ok: false, formError: RENTER_SEND };
  }
  if (!inquiry.data) return { ok: false, formError: RENTER_EXPIRED };

  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const recent = await service
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("inquiry_id", inquiry.data.id)
    .eq("sender_role", "renter")
    .gte("created_at", since);
  if (recent.error) {
    console.error("renter reply limit failed", recent.error.message);
    return { ok: false, formError: RENTER_SEND };
  }
  if ((recent.count ?? 0) >= HOUR_LIMIT) return { ok: false, formError: RENTER_LIMIT };

  const inserted = await service.from("messages").insert({
    inquiry_id: inquiry.data.id,
    sender_id: null,
    sender_role: "renter",
    body,
  });
  if (inserted.error) {
    console.error("renter reply insert failed", inserted.error.message);
    return { ok: false, formError: RENTER_SEND };
  }

  const bumped = await service
    .from("inquiries")
    .update({
      owner_unread: (inquiry.data.owner_unread ?? 0) + 1,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", inquiry.data.id);
  if (bumped.error) {
    console.error("renter reply unread failed", bumped.error.message);
  }

  const listing = await service
    .from("listings")
    .select("title, owner_id")
    .eq("id", inquiry.data.listing_id)
    .maybeSingle();
  if (!listing.error && listing.data?.owner_id) {
    try {
      await deliverRenterMessageNotice({
        ownerId: listing.data.owner_id,
        listingTitle: listing.data.title?.trim() || "your home",
        inquiryId: inquiry.data.id,
      });
    } catch (error) {
      console.error("renter reply email failed", error instanceof Error ? error.message : "error");
    }
  }

  revalidatePath(`/inquiry/${token}`);
  return { ok: true, success: true };
}
