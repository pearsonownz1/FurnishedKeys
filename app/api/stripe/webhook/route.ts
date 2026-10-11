import type Stripe from "stripe";
import { jsonError } from "@/lib/api/http";
import {
  planListingFeeEvent,
  type FeeSnapshot,
  type ListingFeeEvent,
} from "@/lib/listings/fee-events";
import {
  claimFeeEvent,
  findListingById,
  findListingBySubscription,
  invoiceSubscriptionId,
  periodEndFromInvoice,
  periodEndFromSubscription,
} from "@/lib/stripe/apply-fee";
import { getStripe, paymentsNotReady, serverNotConfigured, stripeWebhookSecret } from "@/lib/stripe/config";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();
  if (!stripe || !secret) return paymentsNotReady();
  const service = createServiceClient();
  if (!service) return serverNotConfigured();

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError(400, "Missing Stripe signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return jsonError(400, "Invalid Stripe signature");
  }

  try {
    const result = await handleEvent(stripe, service, event);
    return Response.json({ received: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook failed";
    return jsonError(500, message);
  }
}

async function handleEvent(
  stripe: Stripe,
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  event: Stripe.Event,
): Promise<"applied" | "duplicate" | "ignored"> {
  if (event.type === "checkout.session.completed") {
    return applyCheckout(stripe, service, event);
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    return applyInvoice(stripe, service, event);
  }
  if (event.type === "customer.subscription.deleted") {
    return applyDeleted(service, event);
  }
  return "ignored";
}

async function applyCheckout(
  stripe: Stripe,
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  event: Stripe.Event,
): Promise<"applied" | "duplicate" | "ignored"> {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode !== "subscription") return "ignored";
  const listingId = session.metadata?.listing_id;
  const ownerId = session.metadata?.owner_id;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!listingId || !ownerId || !subscriptionId) return "ignored";

  const listing = await findListingById(service, listingId);
  if (!listing) return "ignored";

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const periodEnd = periodEndFromSubscription(subscription);
  if (!periodEnd) return "ignored";

  const autoRenew = session.metadata?.auto_renew !== "false";
  if (!autoRenew) {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }

  const feeEvent: ListingFeeEvent = {
    id: event.id,
    type: "checkout.session.completed",
    listingId,
    ownerId,
    sessionId: session.id,
    subscriptionId,
    periodEnd,
    amountCents: session.amount_total ?? 19900,
    autoRenew,
    paidAt: new Date().toISOString(),
  };
  return commit(service, listing, feeEvent);
}

async function applyInvoice(
  stripe: Stripe,
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  event: Stripe.Event,
): Promise<"applied" | "duplicate" | "ignored"> {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return "ignored";

  let listing = await findListingBySubscription(service, subscriptionId);
  if (!listing) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const listingId = subscription.metadata?.listing_id;
    if (!listingId) return "ignored";
    listing = await findListingById(service, listingId);
  }
  if (!listing) return "ignored";

  const periodEnd =
    periodEndFromInvoice(invoice) ??
    periodEndFromSubscription(await stripe.subscriptions.retrieve(subscriptionId));
  if (!periodEnd && event.type === "invoice.paid") return "ignored";

  const feeEvent: ListingFeeEvent =
    event.type === "invoice.paid"
      ? {
          id: event.id,
          type: "invoice.paid",
          subscriptionId,
          invoiceId: invoice.id,
          periodEnd: periodEnd ?? new Date().toISOString(),
          amountCents: invoice.amount_paid ?? 0,
          paidAt: new Date().toISOString(),
        }
      : {
          id: event.id,
          type: "invoice.payment_failed",
          subscriptionId,
          invoiceId: invoice.id ?? "unknown",
          periodEnd,
          now: new Date().toISOString(),
        };
  return commit(service, listing, feeEvent);
}

async function applyDeleted(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  event: Stripe.Event,
): Promise<"applied" | "duplicate" | "ignored"> {
  const subscription = event.data.object as Stripe.Subscription;
  let listing = await findListingBySubscription(service, subscription.id);
  if (!listing && subscription.metadata?.listing_id) {
    listing = await findListingById(service, subscription.metadata.listing_id);
  }
  if (!listing) return "ignored";
  return commit(service, listing, {
    id: event.id,
    type: "customer.subscription.deleted",
    subscriptionId: subscription.id,
  });
}

async function commit(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  listing: FeeSnapshot,
  event: ListingFeeEvent,
) {
  const plan = planListingFeeEvent(listing, event);
  if (!plan) return "ignored" as const;
  const claimed = await claimFeeEvent(service, listing.id, event.id, plan);
  if (!claimed) return "duplicate" as const;
  return "applied" as const;
}
