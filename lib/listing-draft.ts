import type { FeeFrequency, FeeKind, PropertyType } from "@/lib/db/types";
import { collapseDates } from "@/lib/calendar-ranges";
import { amenityKeys, type AmenityKey } from "@/lib/listings/amenities";
import { goodForKeys, type GoodForKey } from "@/lib/listings/good-for";

export const listingSteps = [
  { id: "basics", label: "Basics" },
  { id: "rooms", label: "Rooms" },
  { id: "photos", label: "Photos" },
  { id: "description", label: "Description" },
  { id: "goodFor", label: "Good for" },
  { id: "amenities", label: "Amenities" },
  { id: "rent", label: "Rent & fees" },
  { id: "availability", label: "Availability" },
  { id: "rules", label: "House rules" },
  { id: "review", label: "Review" },
] as const;

export type ListingStepId = (typeof listingSteps)[number]["id"];

export const bedChoices = [
  { id: "king", label: "King", beds: "King bed" },
  { id: "queen", label: "Queen", beds: "Queen bed" },
  { id: "full", label: "Full", beds: "Full bed" },
  { id: "twin", label: "Twin", beds: "Twin bed" },
  { id: "bunk", label: "Bunk", beds: "" },
  { id: "sofa", label: "Sofa bed", beds: "Sofa bed" },
] as const;

export type BedChoiceId = (typeof bedChoices)[number]["id"];

export type BedroomDraft = {
  key: string;
  label: string;
  bedType: BedChoiceId | "";
  bunkCount: string;
  /** Kept when the stored beds text is not one of the selects, so a save does not drop it. */
  bedsText: string;
};

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
  isCover: boolean;
};

export type ListingDraft = {
  propertyType: PropertyType;
  title: string;
  summary: string;
  space: string;
  squareFeet: string;
  bedrooms: BedroomDraft[];
  bathrooms: string;
  address: string;
  monthlyRent: string;
  minStay: string;
  fees: DraftFee[];
  availableFrom: string;
  availableTo: string;
  blockedDates: string[];
  calendarUpdatedAt: string | null;
  houseRules: string;
  noSmoking: boolean;
  petsAllowed: boolean;
  petPolicy: string;
  amenities: AmenityKey[];
  goodFor: GoodForKey[];
  photos: DraftPhoto[];
};

const missingStep: Record<string, ListingStepId> = {
  title: "basics",
  description: "description",
  rent: "rent",
  min_stay: "availability",
  bedroom: "rooms",
  bathrooms: "rooms",
  photo: "photos",
  cover: "photos",
};

const missingMessage: Record<string, string> = {
  title: "Add a title.",
  description: "Add a description.",
  rent: "Add the monthly rent.",
  min_stay: "Add a minimum stay.",
  bedroom: "Add a bedroom.",
  bathrooms: "Add the bathroom count.",
  photo: "Add a photo.",
  cover: "Pick a cover photo.",
};

export function emptyDraft(propertyType: PropertyType = "adu"): ListingDraft {
  return {
    propertyType,
    title: "",
    summary: "",
    space: "",
    squareFeet: "",
    bedrooms: [],
    bathrooms: "",
    address: "",
    monthlyRent: "",
    minStay: "",
    fees: [
      { kind: "utilities", label: "Utilities", amount: "", frequency: "monthly", refundable: false },
      { kind: "deposit", label: "Deposit", amount: "", frequency: "one_time", refundable: true },
      { kind: "cleaning", label: "Cleaning", amount: "", frequency: "one_time", refundable: false },
      { kind: "pet", label: "Pet fee", amount: "", frequency: "one_time", refundable: false },
      { kind: "other", label: "Other", amount: "", frequency: "one_time", refundable: false },
    ],
    availableFrom: "",
    availableTo: "",
    blockedDates: [],
    calendarUpdatedAt: null,
    houseRules: "",
    noSmoking: true,
    petsAllowed: false,
    petPolicy: "",
    amenities: [],
    goodFor: [],
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

export function bedsForRoom(room: BedroomDraft): string | null {
  if (room.bedType === "bunk") {
    const count = Number(room.bunkCount);
    if (!Number.isInteger(count) || count < 1) return null;
    return count === 1 ? "1x Bunk bed" : `${count}x Bunk beds`;
  }
  if (room.bedType) {
    const choice = bedChoices.find((item) => item.id === room.bedType);
    return choice?.beds || null;
  }
  const text = room.bedsText.trim();
  return text || null;
}

export function parseBeds(beds: string): Pick<BedroomDraft, "bedType" | "bunkCount" | "bedsText"> {
  const bunk = /^(\d+)x Bunk beds?$/.exec(beds.trim());
  if (bunk?.[1]) return { bedType: "bunk", bunkCount: bunk[1], bedsText: "" };
  const choice = bedChoices.find((item) => item.beds === beds.trim());
  if (choice && choice.id !== "bunk") return { bedType: choice.id, bunkCount: "", bedsText: "" };
  return { bedType: "", bunkCount: "", bedsText: beds.trim() };
}

/** Rows for PATCH bedrooms. Undefined while a room still has no bed, so the save does not wipe the others. */
export function bedroomPayload(
  rooms: BedroomDraft[],
): { label?: string; beds: string }[] | undefined {
  if (rooms.some((room) => !bedsForRoom(room))) return undefined;
  return rooms.map((room) => {
    const beds = bedsForRoom(room) ?? "";
    const label = room.label.trim();
    return label ? { label, beds } : { beds };
  });
}

export function knownAmenities(values: string[]): AmenityKey[] {
  return values.filter((value): value is AmenityKey =>
    (amenityKeys as readonly string[]).includes(value),
  );
}

export function knownGoodFor(values: string[]): GoodForKey[] {
  return values.filter((value): value is GoodForKey =>
    (goodForKeys as readonly string[]).includes(value),
  );
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
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

/** Body for PATCH /api/listings/[id]. Calendar dates go to the calendar route, not this patch. */
export function toListingPatch(draft: ListingDraft): Record<string, unknown> {
  const squareFeet = optionalInt(draft.squareFeet);
  const patch: Record<string, unknown> = {
    property_type: draft.propertyType,
    title: emptyToNull(draft.title),
    description: emptyToNull(draft.summary),
    space_description: emptyToNull(draft.space),
    bathrooms: optionalNumber(draft.bathrooms),
    square_feet: squareFeet != null && squareFeet > 0 ? squareFeet : null,
    address_private: emptyToNull(draft.address),
    monthly_rent_cents: dollarsToCents(draft.monthlyRent),
    pets_allowed: draft.petsAllowed,
    pet_policy: emptyToNull(draft.petPolicy),
    house_rules: emptyToNull(draft.houseRules),
    smoking_allowed: !draft.noSmoking,
    amenities: draft.amenities,
    good_for: draft.goodFor,
  };
  const stay = optionalInt(draft.minStay);
  if (stay != null && stay >= 1) patch.min_stay_months = stay;
  const bedrooms = bedroomPayload(draft.bedrooms);
  if (bedrooms) patch.bedrooms = bedrooms;
  return patch;
}

export function calendarBody(draft: ListingDraft): {
  availability: { available_from: string; available_to: string | null }[];
  blocked_dates: { start_date: string; end_date: string }[];
} {
  const availability = /^\d{4}-\d{2}-\d{2}$/.test(draft.availableFrom)
    ? [
        {
          available_from: draft.availableFrom,
          available_to: /^\d{4}-\d{2}-\d{2}$/.test(draft.availableTo) ? draft.availableTo : null,
        },
      ]
    : [];
  return {
    availability,
    blocked_dates: collapseDates(draft.blockedDates),
  };
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

export function firstMissingStep(fields: string[]): ListingStepId | null {
  for (const step of listingSteps) {
    if (fields.some((field) => missingStep[field] === step.id)) return step.id;
  }
  return null;
}

export function missingForStep(fields: string[], step: ListingStepId): string[] {
  return fields
    .filter((field) => missingStep[field] === step)
    .map((field) => missingMessage[field] ?? "This step still needs a few details.");
}

export function missingCount(fields: string[], step: ListingStepId): number {
  return fields.filter((field) => missingStep[field] === step).length;
}
