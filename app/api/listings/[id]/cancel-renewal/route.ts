import { accessDenied, jsonError } from "@/lib/api/http";
import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import { requireOwner } from "@/lib/listings/access";
import { periodEndFromSubscription, recordCancellation } from "@/lib/stripe/apply-fee";
import { getStripe, paymentsNotReady, serverNotConfigured } from "@/lib/stripe/config";
import { createServiceClient } from "@/lib/supabase/service";

type Context = { params: Promise<{ id: string }> };

async function setRenewal(context: Context, cancel: boolean) {
  const { id } = await context.params;
  const { supabase, user } = await sessionUser();
  const listing = await loadOwnerListing(supabase, id);
  if (!listing) return jsonError(404, "Listing not found");
  const allowed = requireOwner(user?.id ?? null, listing.owner_id);
  if (!allowed.ok) return accessDenied(allowed);
  if (!listing.stripe_subscription_id) {
    return jsonError(409, "This listing has no subscription");
  }

  const stripe = getStripe();
  if (!stripe) return paymentsNotReady();
  const service = createServiceClient();
  if (!service) return serverNotConfigured();

  if (listing.renewal_canceled === cancel) {
    return Response.json({ renewal_canceled: cancel });
  }

  const subscription = await stripe.subscriptions.update(listing.stripe_subscription_id, {
    cancel_at_period_end: cancel,
  });
  const periodEnd = periodEndFromSubscription(subscription);

  await recordCancellation(service, {
    eventId: `${cancel ? "owner-cancel" : "owner-resume"}:${id}:${listing.stripe_subscription_id}:${Date.now()}`,
    listingId: id,
    subscriptionId: listing.stripe_subscription_id,
    status: cancel ? "cancel_scheduled" : "cancel_cleared",
    periodEnd,
  });

  const updated = await service
    .from("listings")
    .update({ renewal_canceled: cancel })
    .eq("id", id);
  if (updated.error) return jsonError(500, updated.error.message);

  return Response.json({ renewal_canceled: cancel, paid_through: listing.fee_paid_through });
}

export function POST(_request: Request, context: Context) {
  return setRenewal(context, true);
}

export function DELETE(_request: Request, context: Context) {
  return setRenewal(context, false);
}
