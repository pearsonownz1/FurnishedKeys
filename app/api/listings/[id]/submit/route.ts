import { accessDenied, jsonError, requestOrigin } from "@/lib/api/http";
import { loadOwnerListing, loadSetupState, sessionUser } from "@/lib/api/owner-listing";
import {
  feeCoversListing,
  missingSubmitFields,
  requireEditableListing,
  slugFromTitle,
} from "@/lib/listings/access";
import { coverPhotoId } from "@/lib/listings/setup";
import { paymentsConfigured, paymentsNotReady } from "@/lib/stripe/config";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await sessionUser();
  const listing = await loadOwnerListing(supabase, id);
  if (!listing) return jsonError(404, "Listing not found");
  const allowed = requireEditableListing(user?.id ?? null, listing);
  if (!allowed.ok) return accessDenied(allowed);

  if (!feeCoversListing(listing, new Date())) {
    if (!paymentsConfigured()) return paymentsNotReady();
    return jsonError(402, "Payment required", {
      checkout_url: `${requestOrigin(request)}/api/listings/${id}/checkout`,
    });
  }

  const setup = await loadSetupState(supabase, id);
  const coverId = coverPhotoId(setup.photos);
  if (coverId) {
    const marked = await supabase.from("listing_photos").update({ is_cover: true }).eq("id", coverId);
    if (marked.error) return jsonError(400, marked.error.message);
  }
  const missing = missingSubmitFields({
    title: listing.title,
    description: listing.description,
    monthly_rent_cents: listing.monthly_rent_cents,
    min_stay_months: listing.min_stay_months,
    bedroomCount: setup.bedroomCount,
    bathrooms: listing.bathrooms,
    photoCount: setup.photoCount,
    hasCover: setup.hasCover || Boolean(coverId),
  });
  if (missing.length > 0) {
    return jsonError(422, "Listing is incomplete", { missing });
  }

  const updated = await supabase
    .from("listings")
    .update({
      status: "pending_review",
      slug: listing.slug ?? slugFromTitle(listing.title ?? "listing"),
    })
    .eq("id", id);
  if (updated.error) return jsonError(400, updated.error.message);

  const next = await loadOwnerListing(supabase, id);
  return Response.json({ listing: next });
}
