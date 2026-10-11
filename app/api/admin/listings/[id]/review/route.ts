import { accessDenied, invalidBody, jsonError, readJson } from "@/lib/api/http";
import { loadRole, loadSetupState, sessionUser, type AppClient } from "@/lib/api/owner-listing";
import { readOwnerListing } from "@/lib/api/read-owner-listing";
import { feeCoversListing, missingSubmitFields, requireAdmin } from "@/lib/listings/access";
import { reviewSchema } from "@/lib/listings/schemas";
import { periodEndFromSubscription, recordCancellation } from "@/lib/stripe/apply-fee";
import { getStripe, serverNotConfigured } from "@/lib/stripe/config";
import { createServiceClient } from "@/lib/supabase/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await sessionUser();
  if (!user) return jsonError(401, "Sign in required");
  const role = await loadRole(supabase, user.id);
  const allowed = requireAdmin(user.id, role);
  if (!allowed.ok) return accessDenied(allowed);

  const loaded = await readOwnerListing(supabase, id);
  if (!loaded.ok) return loaded.response;
  if (!loaded.listing) return jsonError(404, "Listing not found");
  const listing = loaded.listing;

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid input");
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);

  const now = new Date().toISOString();
  const note = parsed.data.note ?? null;

  if (parsed.data.action === "approve") {
    const setup = await loadSetupState(supabase, id);
    const missing = missingSubmitFields({
      title: listing.title,
      description: listing.description,
      monthly_rent_cents: listing.monthly_rent_cents,
      min_stay_months: listing.min_stay_months,
      bedroomCount: setup.bedroomCount,
      bathrooms: listing.bathrooms,
      photoCount: setup.photoCount,
      hasCover: setup.hasCover,
    });
    if (missing.length > 0) return jsonError(422, "Listing is incomplete", { missing });
    if (!feeCoversListing(listing, new Date())) {
      return jsonError(422, "Waive the fee or wait until it is paid before approving");
    }
    const updated = await supabase
      .from("listings")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: now,
        admin_note: note,
        rejection_reason: null,
      })
      .eq("id", id);
    if (updated.error) return jsonError(400, updated.error.message);
    return listingJson(supabase, id);
  }

  if (parsed.data.action === "request_changes") {
    const updated = await supabase
      .from("listings")
      .update({
        status: "changes_requested",
        reviewed_by: user.id,
        reviewed_at: now,
        admin_note: note,
        rejection_reason: note,
      })
      .eq("id", id);
    if (updated.error) return jsonError(400, updated.error.message);
    return listingJson(supabase, id);
  }

  let renewalCanceled = listing.renewal_canceled;
  if (listing.stripe_subscription_id) {
    const stripe = getStripe();
    if (stripe) {
      const subscription = await stripe.subscriptions.update(listing.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      const service = createServiceClient();
      if (!service) return serverNotConfigured();
      await recordCancellation(service, {
        eventId: `admin-reject:${id}:${listing.stripe_subscription_id}:${Date.now()}`,
        listingId: id,
        subscriptionId: listing.stripe_subscription_id,
        status: "cancel_scheduled",
        periodEnd: periodEndFromSubscription(subscription),
      });
      renewalCanceled = true;
    }
  }

  const updated = await supabase
    .from("listings")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: now,
      admin_note: note,
      rejection_reason: note,
      renewal_canceled: renewalCanceled,
    })
    .eq("id", id);
  if (updated.error) return jsonError(400, updated.error.message);
  return listingJson(supabase, id);
}

async function listingJson(supabase: AppClient, id: string) {
  const next = await readOwnerListing(supabase, id);
  if (!next.ok) return next.response;
  return Response.json({ listing: next.listing });
}
