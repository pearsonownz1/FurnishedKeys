import type { ThreadMessage } from "@/lib/owner-dashboard-load";
import { hashRenterToken } from "@/lib/renter-token";
import { createServiceClient } from "@/lib/supabase/service";

export type RenterThread = {
  listingTitle: string;
  inquiryMessage: string;
  messages: ThreadMessage[];
};

/** Public thread for a raw token. Null when the hash does not match. */
export async function loadRenterThread(token: string): Promise<RenterThread | null> {
  const raw = token.trim();
  if (!raw) return null;
  const service = createServiceClient();
  if (!service) return null;

  const inquiry = await service
    .from("inquiries")
    .select("id, listing_id, message")
    .eq("renter_token_hash", hashRenterToken(raw))
    .maybeSingle();
  if (inquiry.error || !inquiry.data) return null;

  const [listing, messages] = await Promise.all([
    service.from("listings").select("title").eq("id", inquiry.data.listing_id).maybeSingle(),
    service
      .from("messages")
      .select("id, sender_role, body, emailed, created_at")
      .eq("inquiry_id", inquiry.data.id)
      .order("created_at", { ascending: true }),
  ]);
  if (messages.error) return null;

  return {
    listingTitle: listing.data?.title?.trim() || "Your inquiry",
    inquiryMessage: inquiry.data.message,
    messages: (messages.data ?? []).map((message) => ({
      id: message.id,
      sender_role: message.sender_role,
      body: message.body,
      emailed: message.emailed === true,
      created_at: message.created_at,
    })),
  };
}
