"use server";

import { sessionUser } from "@/lib/api/owner-listing";
import { deliverInquiryReply, publicOrigin } from "@/lib/email";
import {
  REPLY_MISSING,
  REPLY_SIGN_IN,
  replyFormError,
  replySchema,
  type ReplyActionState,
} from "@/lib/owner-reply";
import { newRenterToken } from "@/lib/renter-token";
import { createServiceClient } from "@/lib/supabase/service";
import { SEND_FAILURE } from "@/lib/writes";

export type { ReplyActionState };

/**
 * Owner reply. Front End calls this from a form on the owner board.
 *
 * `replyToInquiry(previousState, formData)`
 * formData fields: `inquiryId` (uuid), `body` (trimmed, 1–8000 characters).
 *
 * - No session: `{ ok: false, formError: "Sign in again." }`
 * - Invalid id: `{ ok: false, formError: "That inquiry is not on your board." }`
 * - Invalid body: `{ ok: false, formError: "Write a reply between 1 and 8000 characters." }`
 * - Inquiry the signed-in user cannot read, or a message/status write that fails:
 *   `{ ok: false, formError: "That inquiry is not on your board." }` or
 *   `{ ok: false, formError: "We couldn't send this. Please try again." }`
 * - Success: inserts `messages` `{ inquiry_id, sender_id, sender_role: "owner", body }`,
 *   sets the inquiry status to `responded`, rotates the renter token (sha256
 *   stored, raw token only in the email button to `/inquiry/<token>`), then
 *   `{ ok: true, success: true }`. A mail failure is logged and still succeeds.
 *   A token-rotation failure returns the send-failure form error.
 */
export async function replyToInquiry(
  _previous: ReplyActionState,
  formData: FormData,
): Promise<ReplyActionState> {
  const { supabase, user } = await sessionUser();
  if (!user) return { ok: false, formError: REPLY_SIGN_IN };

  const parsed = replySchema.safeParse({
    inquiryId: String(formData.get("inquiryId") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) return { ok: false, formError: replyFormError(parsed.error) };

  const { inquiryId, body } = parsed.data;
  const loaded = await supabase
    .from("inquiries")
    .select("id, email, listing_id, renter_unread")
    .eq("id", inquiryId)
    .maybeSingle();
  if (loaded.error) {
    console.error("inquiry reply load failed", loaded.error.message);
    return { ok: false, formError: SEND_FAILURE };
  }
  if (!loaded.data) return { ok: false, formError: REPLY_MISSING };

  const listing = await supabase
    .from("listings")
    .select("title")
    .eq("id", loaded.data.listing_id)
    .maybeSingle();
  if (listing.error) {
    console.error("inquiry reply listing failed", listing.error.message);
    return { ok: false, formError: SEND_FAILURE };
  }

  const profile = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();
  if (profile.error) {
    console.error("inquiry reply profile failed", profile.error.message);
    return { ok: false, formError: SEND_FAILURE };
  }

  const inserted = await supabase.from("messages").insert({
    inquiry_id: inquiryId,
    sender_id: user.id,
    sender_role: "owner",
    body,
  });
  if (inserted.error) {
    console.error("inquiry reply insert failed", inserted.error.code ?? "error", inserted.error.message);
    return { ok: false, formError: SEND_FAILURE };
  }

  const updated = await supabase
    .from("inquiries")
    .update({ status: "responded" })
    .eq("id", inquiryId);
  if (updated.error) {
    console.error("inquiry reply status failed", updated.error.message);
    return { ok: false, formError: SEND_FAILURE };
  }

  const token = newRenterToken();
  const service = createServiceClient();
  if (!service) {
    console.error("inquiry reply token skipped: service client is not configured");
    return { ok: false, formError: SEND_FAILURE };
  }
  const rotated = await service
    .from("inquiries")
    .update({
      renter_token_hash: token.hash,
      renter_unread: (loaded.data.renter_unread ?? 0) + 1,
      last_message_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);
  if (rotated.error) {
    console.error("inquiry reply token failed", rotated.error.message);
    return { ok: false, formError: SEND_FAILURE };
  }

  try {
    const ownerEmail = profile.data?.email?.trim();
    if (!ownerEmail) {
      console.error("inquiry reply email skipped: owner has no email");
    } else {
      const origin = await publicOrigin();
      await deliverInquiryReply({
        to: loaded.data.email,
        listingTitle: listing.data?.title?.trim() || "your home",
        body,
        replyTo: ownerEmail,
        inquiryUrl: `${origin}/inquiry/${token.raw}`,
      });
    }
  } catch (error) {
    console.error("inquiry reply email failed", error instanceof Error ? error.message : "error");
  }

  return { ok: true, success: true };
}
