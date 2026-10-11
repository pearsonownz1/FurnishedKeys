import {
  loadOwnerListing,
  loadSetupState,
  type AppClient,
  type OwnerListing,
} from "@/lib/api/owner-listing";
import { deliverReviewDecision } from "@/lib/email";
import { missingSubmitFields } from "@/lib/listings/access";
import { revalidateListingPaths } from "@/lib/listings/revalidate-public";
import { periodEndFromSubscription, recordCancellation } from "@/lib/stripe/apply-fee";
import { getStripe } from "@/lib/stripe/config";
import { createServiceClient } from "@/lib/supabase/service";

/** Submit requires a non-empty description. The checklist uses that minimum. */
export const REVIEW_DESCRIPTION_MIN = 1;

/** Admin queue bar. Submit still accepts a single photo. */
export const REVIEW_PHOTO_MIN = 5;

export type ReviewCheck = {
  key: string;
  label: string;
  ok: boolean;
};

export type ReviewChecklistInput = {
  photoCount: number;
  hasCover: boolean;
  description: string | null;
  monthlyRentCents: number | null;
  feeCount: number;
  hasAvailability: boolean;
  amenityCount: number;
  houseRules: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

export function reviewChecklist(input: ReviewChecklistInput): ReviewCheck[] {
  const description = input.description?.trim() ?? "";
  const address = input.address?.trim() ?? "";
  const rules = input.houseRules?.trim() ?? "";
  return [
    {
      key: "photos",
      label: "At least 5 photos",
      ok: input.photoCount >= REVIEW_PHOTO_MIN,
    },
    { key: "cover", label: "Cover photo", ok: input.hasCover },
    {
      key: "description",
      label: "Description",
      ok: description.length >= REVIEW_DESCRIPTION_MIN,
    },
    {
      key: "rent",
      label: "Monthly rent",
      ok: input.monthlyRentCents != null && input.monthlyRentCents > 0,
    },
    { key: "fees", label: "Fees itemized", ok: input.feeCount >= 1 },
    { key: "availability", label: "Availability", ok: input.hasAvailability },
    { key: "amenities", label: "Amenities", ok: input.amenityCount >= 1 },
    { key: "house_rules", label: "House rules", ok: rules.length >= 1 },
    {
      key: "address",
      label: "Address and map pin",
      ok: address.length >= 1 && input.lat != null && input.lng != null,
    },
  ];
}

export function leadSourceLabel(source: string): string {
  return source === "letter" ? "Letter (QR)" : "/owners";
}

export type AdminState = {
  ok: boolean;
  success?: boolean;
  formError?: string;
};

export type ReviewAction = "approve" | "request_changes" | "reject";

export type ReviewOutcome =
  | { ok: true; listing: OwnerListing }
  | { ok: false; status: number; error: string; missing?: string[] };

/** Shared by the review route and the admin actions. Caller has already passed the admin gate. */
export async function performListingReview(input: {
  supabase: AppClient;
  reviewerId: string;
  listingId: string;
  action: ReviewAction;
  note: string | null;
  origin: string;
}): Promise<ReviewOutcome> {
  let listing: OwnerListing | null;
  try {
    listing = await loadOwnerListing(input.supabase, input.listingId);
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Could not load the listing";
    return { ok: false, status: 500, error: message };
  }
  if (!listing) return { ok: false, status: 404, error: "Listing not found" };

  const now = new Date().toISOString();
  const note = input.note;

  if (input.action === "approve") {
    const setup = await loadSetupState(input.supabase, input.listingId);
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
    if (missing.length > 0) {
      return { ok: false, status: 422, error: "Listing is incomplete", missing };
    }
    const updated = await input.supabase
      .from("listings")
      .update({
        status: "approved",
        reviewed_by: input.reviewerId,
        reviewed_at: now,
        admin_note: note,
        rejection_reason: null,
      })
      .eq("id", input.listingId);
    if (updated.error) return { ok: false, status: 400, error: updated.error.message };
    revalidateListingPaths(listing.slug);
    await emailOwner(input.origin, listing, "approved", note);
    return reread(input.supabase, input.listingId);
  }

  if (input.action === "request_changes") {
    const updated = await input.supabase
      .from("listings")
      .update({
        status: "changes_requested",
        reviewed_by: input.reviewerId,
        reviewed_at: now,
        admin_note: note,
        rejection_reason: note,
      })
      .eq("id", input.listingId);
    if (updated.error) return { ok: false, status: 400, error: updated.error.message };
    revalidateListingPaths(listing.slug);
    await emailOwner(input.origin, listing, "changes_requested", note);
    return reread(input.supabase, input.listingId);
  }

  let renewalCanceled = listing.renewal_canceled;
  if (listing.stripe_subscription_id) {
    const stripe = getStripe();
    if (stripe) {
      const subscription = await stripe.subscriptions.update(listing.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      const service = createServiceClient();
      if (!service) return { ok: false, status: 503, error: "Server is not configured" };
      await recordCancellation(service, {
        eventId: `admin-reject:${input.listingId}:${listing.stripe_subscription_id}:${Date.now()}`,
        listingId: input.listingId,
        subscriptionId: listing.stripe_subscription_id,
        status: "cancel_scheduled",
        periodEnd: periodEndFromSubscription(subscription),
      });
      renewalCanceled = true;
    }
  }

  const updated = await input.supabase
    .from("listings")
    .update({
      status: "rejected",
      reviewed_by: input.reviewerId,
      reviewed_at: now,
      admin_note: note,
      rejection_reason: note,
      renewal_canceled: renewalCanceled,
    })
    .eq("id", input.listingId);
  if (updated.error) return { ok: false, status: 400, error: updated.error.message };
  revalidateListingPaths(listing.slug);
  await emailOwner(input.origin, listing, "rejected", note);
  return reread(input.supabase, input.listingId);
}

/**
 * Unpublish sets `archived`. Republish sets `approved` only for a listing that
 * was approved and then archived. Neither path emails the owner.
 */
export async function setListingPublication(input: {
  supabase: AppClient;
  listingId: string;
  published: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let listing: OwnerListing | null;
  try {
    listing = await loadOwnerListing(input.supabase, input.listingId);
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Could not load the listing";
    return { ok: false, error: message };
  }
  if (!listing) return { ok: false, error: "Listing not found" };

  if (input.published) {
    const wasLive = listing.reviewed_at != null && listing.rejection_reason == null;
    if (listing.status !== "archived" || !wasLive) {
      return { ok: false, error: "Only an unpublished listing can go back live." };
    }
    if (
      !listing.title?.trim() ||
      !listing.description?.trim() ||
      listing.monthly_rent_cents == null ||
      listing.monthly_rent_cents <= 0
    ) {
      return { ok: false, error: "Listing is incomplete" };
    }
  } else if (listing.status !== "approved") {
    return { ok: false, error: "Only a live listing can be unpublished." };
  }

  const updated = await input.supabase
    .from("listings")
    .update({ status: input.published ? "approved" : "archived" })
    .eq("id", input.listingId);
  if (updated.error) return { ok: false, error: updated.error.message };
  revalidateListingPaths(listing.slug);
  return { ok: true };
}

async function reread(supabase: AppClient, listingId: string): Promise<ReviewOutcome> {
  try {
    const listing = await loadOwnerListing(supabase, listingId);
    if (!listing) return { ok: false, status: 404, error: "Listing not found" };
    return { ok: true, listing };
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : "Could not load the listing";
    return { ok: false, status: 500, error: message };
  }
}

async function emailOwner(
  origin: string,
  listing: { owner_id: string; title: string | null },
  decision: "approved" | "changes_requested" | "rejected",
  note: string | null,
) {
  try {
    await deliverReviewDecision({
      ownerId: listing.owner_id,
      listingTitle: listing.title?.trim() || "Your listing",
      decision,
      note,
      origin,
    });
  } catch (error) {
    console.error("review email failed", error instanceof Error ? error.message : "error");
  }
}
