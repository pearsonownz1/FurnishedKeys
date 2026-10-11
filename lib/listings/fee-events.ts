import type { ListingFeeStatus } from "@/lib/db/types";

export type FeeSnapshot = {
  id: string;
  owner_id: string;
  listing_fee_status: ListingFeeStatus;
  fee_paid_through: string | null;
  paid_at: string | null;
  stripe_subscription_id: string | null;
  renewal_canceled: boolean;
};

export type FeePatch = {
  listing_fee_status: ListingFeeStatus;
  fee_paid_through: string | null;
  paid_at: string | null;
  stripe_subscription_id: string | null;
  renewal_canceled: boolean;
};

export type ListingFeeEvent =
  | {
      id: string;
      type: "checkout.session.completed";
      listingId: string;
      ownerId: string;
      sessionId: string;
      subscriptionId: string;
      periodEnd: string;
      amountCents: number;
      autoRenew: boolean;
      paidAt: string;
    }
  | {
      id: string;
      type: "invoice.paid";
      subscriptionId: string;
      invoiceId: string;
      periodEnd: string;
      amountCents: number;
      paidAt: string;
    }
  | {
      id: string;
      type: "invoice.payment_failed";
      subscriptionId: string;
      invoiceId: string;
      periodEnd: string | null;
      now: string;
    }
  | {
      id: string;
      type: "customer.subscription.deleted";
      subscriptionId: string;
    };

export type PlannedFeeEvent = {
  paymentStatus: "paid" | "payment_failed" | "subscription_deleted";
  sessionId: string | null;
  invoiceId: string | null;
  subscriptionId: string | null;
  amountCents: number;
  periodEnd: string | null;
  updateListing: boolean;
  patch: FeePatch;
};

function laterIso(current: string | null, next: string): string {
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

/**
 * What a Stripe event should write. Checkout marks the fee paid and leaves
 * status alone so the owner can finish the listing before submit.
 * Returns null when the event does not apply to this listing.
 */
export function planListingFeeEvent(
  listing: FeeSnapshot,
  event: ListingFeeEvent,
): PlannedFeeEvent | null {
  if (event.type === "checkout.session.completed") {
    if (event.listingId !== listing.id || event.ownerId !== listing.owner_id) return null;
    return {
      paymentStatus: "paid",
      sessionId: event.sessionId,
      invoiceId: null,
      subscriptionId: event.subscriptionId,
      amountCents: event.amountCents,
      periodEnd: event.periodEnd,
      updateListing: true,
      patch: {
        listing_fee_status: "paid",
        fee_paid_through: event.periodEnd,
        paid_at: event.paidAt,
        stripe_subscription_id: event.subscriptionId,
        renewal_canceled: !event.autoRenew,
      },
    };
  }

  if (event.type === "invoice.paid") {
    if (listing.stripe_subscription_id && listing.stripe_subscription_id !== event.subscriptionId) {
      return null;
    }
    return {
      paymentStatus: "paid",
      sessionId: null,
      invoiceId: event.invoiceId,
      subscriptionId: event.subscriptionId,
      amountCents: event.amountCents,
      periodEnd: event.periodEnd,
      updateListing: true,
      patch: {
        listing_fee_status: "paid",
        fee_paid_through: laterIso(listing.fee_paid_through, event.periodEnd),
        paid_at: event.paidAt,
        stripe_subscription_id: event.subscriptionId,
        renewal_canceled: listing.renewal_canceled,
      },
    };
  }

  if (event.type === "invoice.payment_failed") {
    if (listing.stripe_subscription_id !== event.subscriptionId) return null;
    const covered =
      listing.fee_paid_through != null &&
      new Date(listing.fee_paid_through).getTime() > new Date(event.now).getTime();
    return {
      paymentStatus: "payment_failed",
      sessionId: null,
      invoiceId: event.invoiceId,
      subscriptionId: event.subscriptionId,
      amountCents: 0,
      periodEnd: event.periodEnd,
      updateListing: !covered,
      patch: {
        listing_fee_status: covered ? listing.listing_fee_status : "unpaid",
        fee_paid_through: listing.fee_paid_through,
        paid_at: listing.paid_at,
        stripe_subscription_id: listing.stripe_subscription_id,
        renewal_canceled: listing.renewal_canceled,
      },
    };
  }

  if (listing.stripe_subscription_id !== event.subscriptionId) return null;
  return {
    paymentStatus: "subscription_deleted",
    sessionId: null,
    invoiceId: null,
    subscriptionId: event.subscriptionId,
    amountCents: 0,
    periodEnd: listing.fee_paid_through,
    updateListing: true,
    patch: {
      listing_fee_status: "unpaid",
      fee_paid_through: listing.fee_paid_through,
      paid_at: listing.paid_at,
      stripe_subscription_id: listing.stripe_subscription_id,
      renewal_canceled: false,
    },
  };
}

export type FeeClaim = {
  eventId: string;
  listingId: string;
  plan: PlannedFeeEvent;
};

export type FeeStore = {
  claim(claim: FeeClaim): Promise<boolean>;
  save(listingId: string, patch: FeePatch): Promise<void>;
};

/** Claim the Stripe event id once, then write the listing patch. */
export async function commitListingFeeEvent(
  store: FeeStore,
  listing: FeeSnapshot,
  event: ListingFeeEvent,
): Promise<"applied" | "duplicate" | "ignored"> {
  const plan = planListingFeeEvent(listing, event);
  if (!plan) return "ignored";
  const claimed = await store.claim({ eventId: event.id, listingId: listing.id, plan });
  if (!claimed) return "duplicate";
  if (plan.updateListing) await store.save(listing.id, plan.patch);
  return "applied";
}

export function unixToIso(unix: number | null | undefined): string | null {
  if (unix == null || !Number.isFinite(unix)) return null;
  return new Date(unix * 1000).toISOString();
}
