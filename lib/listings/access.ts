import type { ListingFeeStatus, ListingStatus } from "@/lib/db/types";

export const EDITABLE_LISTING_STATUSES = [
  "draft",
  "rejected",
  "changes_requested",
] as const satisfies readonly ListingStatus[];

export type EditableListingStatus = (typeof EDITABLE_LISTING_STATUSES)[number];

export const SOURCE_PATTERN = /^[a-z0-9_-]{1,40}$/;

export type AccessDenial = {
  ok: false;
  status: 401 | 403 | 409;
  error: string;
};

export type Access = { ok: true } | AccessDenial;

export function requireUser(userId: string | null): Access {
  if (!userId) {
    return { ok: false, status: 401, error: "Sign in required" };
  }
  return { ok: true };
}

export function requireOwner(userId: string | null, ownerId: string): Access {
  const signedIn = requireUser(userId);
  if (!signedIn.ok) return signedIn;
  if (userId !== ownerId) {
    return { ok: false, status: 403, error: "Only the owner can change this listing" };
  }
  return { ok: true };
}

export function requireAdmin(userId: string | null, role: string | null): Access {
  const signedIn = requireUser(userId);
  if (!signedIn.ok) return signedIn;
  if (role !== "admin") {
    return { ok: false, status: 403, error: "Admin only" };
  }
  return { ok: true };
}

export function requireEditableListing(
  userId: string | null,
  listing: { owner_id: string; status: ListingStatus },
): Access {
  const owner = requireOwner(userId, listing.owner_id);
  if (!owner.ok) return owner;
  if (!(EDITABLE_LISTING_STATUSES as readonly string[]).includes(listing.status)) {
    return {
      ok: false,
      status: 409,
      error: "This listing can only be edited while it is a draft, rejected, or changes were requested",
    };
  }
  return { ok: true };
}

export type FeeListing = {
  listing_fee_status: ListingFeeStatus;
  fee_paid_through: string | null;
};

/** Paid coverage is still inside fee_paid_through, or the fee was waived. */
export function feeCoversListing(listing: FeeListing, now: Date): boolean {
  if (listing.listing_fee_status === "waived") return true;
  if (listing.listing_fee_status !== "paid" || !listing.fee_paid_through) return false;
  return new Date(listing.fee_paid_through).getTime() > now.getTime();
}

export type CompletenessInput = {
  title: string | null;
  description: string | null;
  monthly_rent_cents: number | null;
  photoCount: number;
  availabilityCount: number;
};

const MISSING_LABELS = {
  title: "title",
  description: "description",
  rent: "rent",
  photo: "photo",
  availability: "availability",
} as const;

export function missingSubmitFields(input: CompletenessInput): string[] {
  const missing: string[] = [];
  if (!input.title?.trim()) missing.push(MISSING_LABELS.title);
  if (!input.description?.trim()) missing.push(MISSING_LABELS.description);
  if (input.monthly_rent_cents == null || input.monthly_rent_cents <= 0) {
    missing.push(MISSING_LABELS.rent);
  }
  if (input.photoCount < 1) missing.push(MISSING_LABELS.photo);
  if (input.availabilityCount < 1) missing.push(MISSING_LABELS.availability);
  return missing;
}

export function normalizeSource(value: string | undefined): string | null {
  if (value == null || value.trim() === "") return "web";
  const source = value.trim();
  return SOURCE_PATTERN.test(source) ? source : null;
}

export function slugFromTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base || "listing"}-${suffix}`;
}
