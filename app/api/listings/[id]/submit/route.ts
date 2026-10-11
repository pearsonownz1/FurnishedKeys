import { accessDenied, jsonError } from "@/lib/api/http";
import { loadSetupState } from "@/lib/api/owner-listing";
import { openOwnerListing, readOwnerListing } from "@/lib/api/read-owner-listing";
import { missingSubmitFields, requireEditableListing, slugFromTitle } from "@/lib/listings/access";
import { revalidateListingPaths } from "@/lib/listings/revalidate-public";
import { coverPhotoId } from "@/lib/listings/setup";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const opened = await openOwnerListing(id);
  if (!opened.ok) return opened.response;
  const { supabase, user, listing } = opened;
  const allowed = requireEditableListing(user.id, listing);
  if (!allowed.ok) return accessDenied(allowed);

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

  const slug = listing.slug ?? slugFromTitle(listing.title ?? "listing");
  const updated = await supabase
    .from("listings")
    .update({
      status: "pending_review",
      slug,
    })
    .eq("id", id);
  if (updated.error) return jsonError(400, updated.error.message);
  revalidateListingPaths(slug);

  const next = await readOwnerListing(supabase, id);
  if (!next.ok) return next.response;
  return Response.json({ listing: next.listing });
}
