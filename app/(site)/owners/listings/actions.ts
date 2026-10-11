"use server";

import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import type { FeeFrequency, FeeKind } from "@/lib/db/types";

export type FeeInput = {
  kind: FeeKind;
  label: string;
  amount_cents: number;
  frequency: FeeFrequency;
  refundable: boolean;
};

export async function saveListingFees(
  listingId: string,
  fees: FeeInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, user } = await sessionUser();
  const listing = await loadOwnerListing(supabase, listingId);
  if (!listing || !user || listing.owner_id !== user.id) {
    return { ok: false, error: "Sign in required" };
  }

  const removed = await supabase.from("listing_fees").delete().eq("listing_id", listingId);
  if (removed.error) return { ok: false, error: removed.error.message };
  if (fees.length === 0) return { ok: true };

  const inserted = await supabase.from("listing_fees").insert(
    fees.map((fee) => ({
      listing_id: listingId,
      kind: fee.kind,
      label: fee.label,
      amount_cents: fee.amount_cents,
      frequency: fee.frequency,
      refundable: fee.refundable,
    })),
  );
  if (inserted.error) return { ok: false, error: inserted.error.message };
  return { ok: true };
}

async function ownerListing(listingId: string) {
  const { supabase, user } = await sessionUser();
  const listing = await loadOwnerListing(supabase, listingId);
  if (!listing || !user || listing.owner_id !== user.id) return null;
  return { supabase, listing };
}

export async function reorderListingPhotos(
  listingId: string,
  paths: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = await ownerListing(listingId);
  if (!owner) return { ok: false, error: "Sign in required" };
  for (let index = 0; index < paths.length; index += 1) {
    const path = paths[index];
    if (!path) continue;
    const updated = await owner.supabase
      .from("listing_photos")
      .update({ sort: index })
      .eq("listing_id", listingId)
      .eq("storage_path", path);
    if (updated.error) return { ok: false, error: updated.error.message };
  }
  return { ok: true };
}

/** One cover. The previous cover is cleared first so the unique index can accept the new one. */
export async function setListingCover(
  listingId: string,
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const owner = await ownerListing(listingId);
  if (!owner) return { ok: false, error: "Sign in required" };
  const cleared = await owner.supabase
    .from("listing_photos")
    .update({ is_cover: false })
    .eq("listing_id", listingId)
    .eq("is_cover", true);
  if (cleared.error) return { ok: false, error: cleared.error.message };
  const marked = await owner.supabase
    .from("listing_photos")
    .update({ is_cover: true })
    .eq("listing_id", listingId)
    .eq("id", photoId);
  if (marked.error) return { ok: false, error: marked.error.message };
  return { ok: true };
}
