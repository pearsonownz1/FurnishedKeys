import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import type { ListingFee } from "@/lib/db/types";
import { centsToDollars, emptyDraft, type ListingDraft } from "@/lib/listing-draft";
import { LISTING_PHOTOS_BUCKET, LISTING_PHOTO_TTL_SECONDS } from "@/lib/photos";

export async function loadListingEditor(id: string): Promise<{
  draft: ListingDraft;
  title: string;
} | null> {
  const { supabase, user } = await sessionUser();
  if (!user) return null;
  const listing = await loadOwnerListing(supabase, id);
  if (!listing || listing.owner_id !== user.id) return null;

  const [fees, photos, windows, address] = await Promise.all([
    supabase.from("listing_fees").select("*").eq("listing_id", id),
    supabase.from("listing_photos").select("*").eq("listing_id", id).order("sort"),
    supabase.from("availability_windows").select("*").eq("listing_id", id),
    supabase.rpc("listing_address", { target_listing: id }),
  ]);

  const draft = emptyDraft(listing.property_type);
  draft.title = listing.title ?? "";
  draft.description = listing.description ?? "";
  draft.bedrooms = listing.bedrooms == null ? "" : String(listing.bedrooms);
  draft.bathrooms = listing.bathrooms == null ? "" : String(listing.bathrooms);
  draft.maxOccupants = listing.max_occupants == null ? "" : String(listing.max_occupants);
  draft.address = address.data ?? "";
  draft.monthlyRent = centsToDollars(listing.monthly_rent_cents);
  draft.houseRules = listing.house_rules ?? "";
  draft.petsAllowed = listing.pets_allowed;
  draft.petPolicy = listing.pet_policy ?? "";
  draft.amenities = listing.amenities ?? [];

  const window = windows.data?.[0];
  draft.availableFrom = window?.available_from ?? "";
  draft.availableTo = window?.available_to ?? "";

  for (const fee of (fees.data ?? []) as ListingFee[]) {
    const slot = draft.fees.find((row) => row.kind === fee.kind);
    if (slot) slot.amount = centsToDollars(fee.amount_cents);
  }

  const paths = (photos.data ?? []).map((photo) => photo.storage_path);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const urls = await supabase.storage
      .from(LISTING_PHOTOS_BUCKET)
      .createSignedUrls(paths, LISTING_PHOTO_TTL_SECONDS);
    for (const row of urls.data ?? []) {
      if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
    }
  }
  draft.photos = (photos.data ?? []).map((photo) => ({
    id: photo.id,
    path: photo.storage_path,
    url: signed.get(photo.storage_path) ?? null,
  }));

  return { draft, title: listing.title ?? "" };
}
