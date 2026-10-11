import { accessDenied, jsonError } from "@/lib/api/http";
import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import { requireOwner } from "@/lib/listings/access";
import { periodEndFromSubscription } from "@/lib/stripe/apply-fee";
import { getStripe, paymentsNotReady } from "@/lib/stripe/config";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return jsonError(400, "session_id is required");

  const { supabase, user } = await sessionUser();
  const listing = await loadOwnerListing(supabase, id);
  if (!listing) return jsonError(404, "Listing not found");
  const allowed = requireOwner(user?.id ?? null, listing.owner_id);
  if (!allowed.ok) return accessDenied(allowed);

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
