"use server";

import { sessionUser } from "@/lib/api/owner-listing";
import { collapseDates, expandRanges } from "@/lib/calendar-ranges";
import { revalidateListingPaths } from "@/lib/listings/revalidate-public";
import { applyBlockedDays } from "@/lib/owner-dashboard";

export type BlockedDatesState = {
  ok: boolean;
  formError?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Toggle individual blocked days on the owner's listing.
 * Uses `listing_blocked_dates` ranges. Other days are kept.
 * `blocked: true` adds the days. `blocked: false` removes them.
 */
export async function setBlockedDates(
  listingId: string,
  days: string[],
  blocked: boolean,
): Promise<BlockedDatesState> {
  if (!uuidPattern.test(listingId)) {
    return { ok: false, formError: "That listing is not yours." };
  }
  if (!Array.isArray(days) || days.length > 366 || days.some((day) => !dayPattern.test(day))) {
    return { ok: false, formError: "Choose dates as YYYY-MM-DD." };
  }

  const { supabase, user } = await sessionUser();
  if (!user) return { ok: false, formError: "Sign in again." };

  const listing = await supabase.from("listings").select("id").eq("id", listingId).maybeSingle();
  if (listing.error) {
    console.error("blocked dates listing failed", listing.error.message);
    return { ok: false, formError: "We couldn't save those dates. Please try again." };
  }
  if (!listing.data) return { ok: false, formError: "That listing is not yours." };

  const existing = await supabase
    .from("listing_blocked_dates")
    .select("start_date, end_date")
    .eq("listing_id", listingId);
  if (existing.error) {
    console.error("blocked dates load failed", existing.error.message);
    return { ok: false, formError: "We couldn't save those dates. Please try again." };
  }

  const next = collapseDates(applyBlockedDays(expandRanges(existing.data ?? []), days, blocked));
  const removed = await supabase.from("listing_blocked_dates").delete().eq("listing_id", listingId);
  if (removed.error) {
    console.error("blocked dates delete failed", removed.error.message);
    return { ok: false, formError: "We couldn't save those dates. Please try again." };
  }
  if (next.length === 0) return { ok: true };

  const inserted = await supabase.from("listing_blocked_dates").insert(
    next.map((range) => ({
      listing_id: listingId,
      start_date: range.start_date,
      end_date: range.end_date,
    })),
  );
  if (inserted.error) {
    console.error("blocked dates insert failed", inserted.error.message);
    return { ok: false, formError: "We couldn't save those dates. Please try again." };
  }
  return { ok: true };
}

/**
 * Owner confirms availability now.
 * Browse cards read `availability_windows.last_confirmed_at` ("Availability confirmed").
 * The property page trust line reads `listings.calendar_updated_at` ("Calendar updated").
 * Both stamps are set to now, then the property page, /rentals, and / are revalidated.
 */
export async function confirmAvailability(listingId: string): Promise<BlockedDatesState> {
  if (!uuidPattern.test(listingId)) {
    return { ok: false, formError: "That listing is not yours." };
  }

  const { supabase, user } = await sessionUser();
  if (!user) return { ok: false, formError: "Sign in again." };

  const listing = await supabase
    .from("listings")
    .select("id, slug, owner_id")
    .eq("id", listingId)
    .maybeSingle();
  if (listing.error) {
    console.error("confirm availability listing failed", listing.error.message);
    return { ok: false, formError: "We couldn't confirm availability. Please try again." };
  }
  if (!listing.data || listing.data.owner_id !== user.id) {
    return { ok: false, formError: "That listing is not yours." };
  }

  const now = new Date().toISOString();
  const windows = await supabase
    .from("availability_windows")
    .update({ last_confirmed_at: now, confirmed_by: user.id })
    .eq("listing_id", listingId);
  if (windows.error) {
    console.error("confirm availability windows failed", windows.error.message);
    return { ok: false, formError: "We couldn't confirm availability. Please try again." };
  }

  const stamped = await supabase
    .from("listings")
    .update({ calendar_updated_at: now })
    .eq("id", listingId);
  if (stamped.error) {
    console.error("confirm availability stamp failed", stamped.error.message);
    return { ok: false, formError: "We couldn't confirm availability. Please try again." };
  }

  revalidateListingPaths(listing.data.slug);
  return { ok: true };
}
