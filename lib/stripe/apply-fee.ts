import type Stripe from "stripe";
import { unixToIso, type FeeSnapshot, type PlannedFeeEvent } from "@/lib/listings/fee-events";
import { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

export function periodEndFromSubscription(subscription: Stripe.Subscription): string | null {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  const legacy = (subscription as Stripe.Subscription & { current_period_end?: number })
    .current_period_end;
  return unixToIso(itemEnd ?? legacy ?? null);
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent?.subscription_details?.subscription;
  if (typeof parent === "string") return parent;
  if (parent && typeof parent === "object" && "id" in parent) return parent.id;
  const legacy = (invoice as Stripe.Invoice & { subscription?: string | { id: string } | null })
    .subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy === "object" && "id" in legacy) return legacy.id;
  return null;
}

export function periodEndFromInvoice(invoice: Stripe.Invoice): string | null {
  let max = 0;
  for (const line of invoice.lines?.data ?? []) {
    const end = line.period?.end ?? 0;
    if (end > max) max = end;
  }
  return max ? unixToIso(max) : null;
}

export async function findListingBySubscription(
  service: ServiceClient,
  subscriptionId: string,
): Promise<FeeSnapshot | null> {
  const { data, error } = await service
    .from("listings")
    .select(
      "id, owner_id, listing_fee_status, fee_paid_through, paid_at, stripe_subscription_id, renewal_canceled",
    )
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FeeSnapshot | null) ?? null;
}

export async function findListingById(
  service: ServiceClient,
  listingId: string,
): Promise<FeeSnapshot | null> {
  const { data, error } = await service
    .from("listings")
    .select(
      "id, owner_id, listing_fee_status, fee_paid_through, paid_at, stripe_subscription_id, renewal_canceled",
    )
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FeeSnapshot | null) ?? null;
}

export async function claimFeeEvent(
  service: ServiceClient,
  listingId: string,
  eventId: string,
  plan: PlannedFeeEvent,
): Promise<boolean> {
  const { data, error } = await service.rpc("apply_listing_fee_event", {
    event_id: eventId,
    target_listing: listingId,
    session_id: plan.sessionId,
    invoice_id: plan.invoiceId,
    subscription_id: plan.subscriptionId,
    amount_cents: plan.amountCents,
    payment_status: plan.paymentStatus,
    period_end: plan.periodEnd,
    update_listing: plan.updateListing,
    next_fee_status: plan.patch.listing_fee_status,
    next_paid_through: plan.patch.fee_paid_through,
    next_paid_at: plan.patch.paid_at,
    next_subscription_id: plan.patch.stripe_subscription_id,
    next_renewal_canceled: plan.patch.renewal_canceled,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function recordCancellation(
  service: ServiceClient,
  input: {
    eventId: string;
    listingId: string;
    subscriptionId: string;
    status: "cancel_scheduled" | "cancel_cleared";
    periodEnd: string | null;
  },
) {
  const { error } = await service.from("listing_payments").insert({
    listing_id: input.listingId,
    stripe_event_id: input.eventId,
    stripe_subscription_id: input.subscriptionId,
    amount_cents: 0,
    status: input.status,
    period_end: input.periodEnd,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
}
