import type { FeeFrequency, FeeKind, PropertyType } from "@/lib/db/types";

export const listingSteps = [
  { id: "basics", label: "Basics" },
  { id: "photos", label: "Photos" },
  { id: "rent", label: "Rent & fees" },
  { id: "availability", label: "Availability" },
  { id: "rules", label: "House rules" },
  { id: "review", label: "Review & pay" },
] as const;

export type ListingStepId = (typeof listingSteps)[number]["id"];

export type DraftFee = {
  kind: FeeKind;
  label: string;
  amount: string;
  frequency: FeeFrequency;
  refundable: boolean;
};

export type DraftPhoto = {
  id: string;
  path: string;
  url: string | null;
};

export type ListingDraft = {
  fullName: string;
  email: string;
  phone: string;
  propertyType: PropertyType;
  title: string;
  description: string;
  bedrooms: string;
  bathrooms: string;
  maxOccupants: string;
  address: string;
  monthlyRent: string;
  fees: DraftFee[];
  availableFrom: string;
  availableTo: string;
  houseRules: string;
  petsAllowed: boolean;
  petPolicy: string;
  amenities: string[];
  photos: DraftPhoto[];
};

export const amenityChoices = [
  "Furnished",
  "Kitchen",
  "Washer and dryer",
  "Workspace",
  "Parking",
] as const;

export function emptyDraft(propertyType: PropertyType = "adu"): ListingDraft {
  return {
    fullName: "",
    email: "",
    phone: "",
    propertyType,
    title: "",
    description: "",
    bedrooms: "",
    bathrooms: "",
    maxOccupants: "",
    address: "",
    monthlyRent: "",
    fees: [
      { kind: "utilities", label: "Utilities", amount: "", frequency: "monthly", refundable: false },
      { kind: "deposit", label: "Deposit", amount: "", frequency: "one_time", refundable: true },
      { kind: "cleaning", label: "Cleaning", amount: "", frequency: "one_time", refundable: false },
      { kind: "pet", label: "Pet fee", amount: "", frequency: "one_time", refundable: false },
    ],
    availableFrom: "",
    availableTo: "",
    houseRules: "",
    petsAllowed: false,
    petPolicy: "",
    amenities: ["Furnished"],
    photos: [],
  };
}

export function dollarsToCents(value: string): number | null {
  const trimmed = value.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function centsToDollars(cents: number | null): string {
  if (cents == null) return "";
  return String(cents / 100);
}

export function isListingStep(value: string | undefined): value is ListingStepId {
  return listingSteps.some((step) => step.id === value);
}

export function stepFromQuery(value: string | undefined): ListingStepId {
  return isListingStep(value) ? value : "basics";
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isInteger(number) || number < 0) return null;
  return number;
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

/** Body for PATCH /api/listings/[id]. Availability is sent only after a start date. */
export function toListingPatch(draft: ListingDraft): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    property_type: draft.propertyType,
    title: draft.title.trim() || null,
    description: draft.description.trim() || null,
    bedrooms: optionalInt(draft.bedrooms),
    bathrooms: optionalNumber(draft.bathrooms),
    max_occupants: optionalInt(draft.maxOccupants),
    address_private: draft.address.trim() || null,
    monthly_rent_cents: dollarsToCents(draft.monthlyRent),
    pets_allowed: draft.petsAllowed,
    pet_policy: draft.petPolicy.trim() || null,
    house_rules: draft.houseRules.trim() || null,
    amenities: draft.amenities,
  };
  if (/^\d{4}-\d{2}-\d{2}$/.test(draft.availableFrom)) {
    patch.availability = [
      {
        available_from: draft.availableFrom,
        available_to: /^\d{4}-\d{2}-\d{2}$/.test(draft.availableTo) ? draft.availableTo : null,
      },
    ];
  }
  return patch;
}

export function feeRows(draft: ListingDraft, listingId: string) {
  return draft.fees.flatMap((fee) => {
    const amount = dollarsToCents(fee.amount);
    if (amount == null) return [];
    return [
      {
        listing_id: listingId,
        kind: fee.kind,
        label: fee.label,
        amount_cents: amount,
        frequency: fee.frequency,
        refundable: fee.refundable,
      },
    ];
  });
}
