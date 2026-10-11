import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import { expandRanges } from "@/lib/calendar-ranges";
import type { ListingBedroom, ListingFee, ListingFeeStatus } from "@/lib/db/types";
import {
  centsToDollars,
  emptyDraft,
  knownAmenities,
  knownGoodFor,
  parseBeds,
  type ListingDraft,
} from "@/lib/listing-draft";
import { locationById, locationShort } from "@/lib/locations";
import { LISTING_PHOTOS_BUCKET, LISTING_PHOTO_TTL_SECONDS } from "@/lib/photos";

export type LoadedListing = {
  draft: ListingDraft;
  title: string;
  placeLabel: string;
  paidThrough: string | null;
  feeStatus: ListingFeeStatus;
  setupStep: string | null;
};

export type EditorLoadResult =
  | { status: "ready"; listing: LoadedListing }
  | { status: "signed-out" }
  | { status: "missing" }
  | { status: "error" };

export async function loadListingEditor(id: string): Promise<EditorLoadResult> {
  const { supabase, user } = await sessionUser();
  if (!user) return { status: "signed-out" };
  let listing;
  try {
    listing = await loadOwnerListing(supabase, id);
  } catch {
    return { status: "error" };
  }
  if (!listing || listing.owner_id !== user.id) return { status: "missing" };

  const [fees, photos, windows, blocked, rooms, address] = await Promise.all([
    supabase.from("listing_fees").select("*").eq("listing_id", id),
    supabase.from("listing_photos").select("*").eq("listing_id", id).order("sort"),
    supabase.from("availability_windows").select("*").eq("listing_id", id).order("available_from"),
    supabase.from("listing_blocked_dates").select("start_date, end_date").eq("listing_id", id),
    supabase.from("listing_bedrooms").select("*").eq("listing_id", id).order("sort"),
    supabase.rpc("listing_address", { target_listing: id }),
  ]);

  if (
    fees.error ||
    photos.error ||
    windows.error ||
    blocked.error ||
    rooms.error ||
    address.error
  ) {
    return { status: "error" };
  }

  const draft = emptyDraft(listing.property_type);
  draft.title = listing.title ?? "";
  draft.summary = listing.description ?? "";
  draft.space = listing.space_description ?? "";
  draft.squareFeet = listing.square_feet == null ? "" : String(listing.square_feet);
  draft.bathrooms = listing.bathrooms == null ? "" : String(listing.bathrooms);
  draft.address = address.data ?? "";
  draft.monthlyRent = centsToDollars(listing.monthly_rent_cents);
  draft.minStay = listing.min_stay_months == null ? "" : String(listing.min_stay_months);
  draft.houseRules = listing.house_rules ?? "";
  draft.noSmoking = !listing.smoking_allowed;
  draft.petsAllowed = listing.pets_allowed;
  draft.petPolicy = listing.pet_policy ?? "";
  draft.amenities = knownAmenities(listing.amenities ?? []);
  draft.goodFor = knownGoodFor(listing.good_for ?? []);
  draft.calendarUpdatedAt = listing.calendar_updated_at;
  draft.bedrooms = ((rooms.data ?? []) as ListingBedroom[]).map((room) => ({
    key: room.id,
    label: room.label,
    ...parseBeds(room.beds),
  }));

  const window = windows.data?.[0];
  draft.availableFrom = window?.available_from ?? "";
  draft.availableTo = window?.available_to ?? "";
  draft.blockedDates = expandRanges(blocked.data ?? []);

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
    isCover: photo.is_cover,
  }));

  const place = locationById(listing.location_id);
  return {
    status: "ready",
    listing: {
      draft,
      title: listing.title ?? "",
      placeLabel: place ? locationShort(place) : "",
      paidThrough: listing.fee_paid_through,
      feeStatus: listing.listing_fee_status,
      setupStep: listing.setup_step,
    },
  };
}
