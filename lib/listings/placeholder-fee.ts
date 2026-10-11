import type { ListingFeeStatus } from "@/lib/db/types";
import { createServiceClient } from "@/lib/supabase/service";

export const WAIVED_NO_STRIPE_STATUS = "waived_no_stripe" as const;

type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

export type PlaceholderListing = {
  id: string;
  listing_fee_status: ListingFeeStatus;
  fee_paid_through: string | null;
  paid_at: string | null;
  stripe_subscription_id: string | null;
  renewal_canceled: boolean;
};

export type WaivedCheckoutBody = {
  waived: true;
  paid_through: string | null;
};

/** Paid or waived already covers the listing. A second checkout must not write. */
export function feeAlreadyRecorded(status: ListingFeeStatus): boolean {
  return status === "paid" || status === "waived";
}

/** Calendar year ahead of `now`, matching `timestamptz + interval '1 year'` for non-leap days. */
export function oneYearFrom(now: Date): string {
  const end = new Date(now.getTime());
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  return end.toISOString();
}

export function waivedCheckoutBody(paidThrough: string | null): WaivedCheckoutBody {
  return { waived: true, paid_through: paidThrough };
}

/**
 * Service-role write: waive the fee for one year and store one ledger row.
 * A repeat for a listing that is already paid or waived does not write.
 * The event id is stable per listing, so a raced second insert is a no-op.
 */
export async function recordPlaceholderWaiver(
  service: ServiceClient,
  listing: PlaceholderListing,
  now: Date,
): Promise<WaivedCheckoutBody> {
  if (feeAlreadyRecorded(listing.listing_fee_status)) {
    return waivedCheckoutBody(listing.fee_paid_through);
  }

  const paidThrough = oneYearFrom(now);
  const { data, error } = await service.rpc("apply_listing_fee_event", {
    event_id: `waived_no_stripe:${listing.id}`,
    target_listing: listing.id,
    session_id: null,
    invoice_id: null,
    subscription_id: null,
    amount_cents: 0,
    payment_status: WAIVED_NO_STRIPE_STATUS,
    period_end: paidThrough,
    update_listing: true,
    next_fee_status: "waived",
    next_paid_through: paidThrough,
    next_paid_at: listing.paid_at,
    next_subscription_id: listing.stripe_subscription_id,
    next_renewal_canceled: listing.renewal_canceled,
  });
  if (error) throw new Error(error.message);
  if (data === true) return waivedCheckoutBody(paidThrough);

  const { data: current, error: readError } = await service
    .from("listings")
    .select("listing_fee_status, fee_paid_through")
    .eq("id", listing.id)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (current && feeAlreadyRecorded(current.listing_fee_status)) {
    return waivedCheckoutBody(current.fee_paid_through);
  }
  throw new Error("Could not record the listing fee waiver");
}
