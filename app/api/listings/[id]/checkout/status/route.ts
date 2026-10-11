import { accessDenied, jsonError } from "@/lib/api/http";
import { openOwnerListing } from "@/lib/api/read-owner-listing";
import { requireOwner } from "@/lib/listings/access";
import { periodEndFromSubscription } from "@/lib/stripe/apply-fee";
import { getStripe, paymentsNotReady } from "@/lib/stripe/config";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const opened = await openOwnerListing(id);
  if (!opened.ok) return opened.response;
  const { listing } = opened;
  const allowed = requireOwner(opened.user.id, listing.owner_id);
  if (!allowed.ok) return accessDenied(allowed);

  if (listing.listing_fee_status === "waived") {
    return Response.json({ status: "waived", paid_through: listing.fee_paid_through });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return jsonError(400, "session_id is required");

  const stripe = getStripe();
  if (!stripe) return paymentsNotReady();

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.listing_id !== id) return jsonError(404, "Checkout session not found");

  let paidThrough = listing.fee_paid_through;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    paidThrough = periodEndFromSubscription(subscription) ?? paidThrough;
  }

  const status = session.payment_status === "paid" ? "paid" : session.status;
  return Response.json({ status, paid_through: paidThrough });
}
