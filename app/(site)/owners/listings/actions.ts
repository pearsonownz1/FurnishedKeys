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
