import type { OwnerLeadInsert, OwnerLeadInterest } from "@/lib/db/types";
import {
  furnishedLevels,
  ownerLeadInterests,
  propertyTypes,
} from "@/lib/db/types";
import { activeLocations } from "@/lib/locations";

export type OwnerLeadInput = {
  name: string;
  email: string;
  phone: string;
  interest: string;
  propertyType: string;
  furnished: string;
  locationId: string;
  propertyAddress: string;
  currentUse: string;
  availableFrom: string;
  notes: string;
  source: string;
};

export type OwnerLeadField = keyof Omit<OwnerLeadInput, "source">;

export type OwnerLeadResult =
  | { ok: true }
  | { ok: false; fieldErrors: Partial<Record<OwnerLeadField, string>> };

export type OwnerLeadActionState = {
  ok: boolean;
  success?: boolean;
  fieldErrors?: Partial<Record<OwnerLeadField, string>>;
  formError?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const sourcePattern = /^[a-z0-9_-]{1,40}$/;

export function sanitizeSource(value: string | undefined): string {
  const source = value?.trim() ?? "";
  return sourcePattern.test(source) ? source : "";
}

function isInterest(value: string): value is OwnerLeadInterest {
  return (ownerLeadInterests as readonly string[]).includes(value);
}

export function readOwnerLeadForm(formData: FormData): OwnerLeadInput {
  const read = (key: string) => String(formData.get(key) ?? "").trim();
  return {
    name: read("name"),
    email: read("email"),
    phone: read("phone"),
    interest: read("interest"),
    propertyType: read("propertyType"),
    furnished: read("furnished"),
    locationId: read("locationId"),
    propertyAddress: read("propertyAddress"),
    currentUse: read("currentUse"),
    availableFrom: read("availableFrom"),
    notes: read("notes"),
    source: sanitizeSource(read("source")),
  };
}

export function validateOwnerLead(input: OwnerLeadInput): OwnerLeadResult {
  const fieldErrors: Partial<Record<OwnerLeadField, string>> = {};

  if (input.name.length < 1 || input.name.length > 200) {
    fieldErrors.name = "Add your name.";
  }
  if (!emailPattern.test(input.email) || input.email.length > 200) {
    fieldErrors.email = "Add a valid email.";
  }
  if (input.phone && (input.phone.length > 40 || input.phone.replace(/\D/g, "").length < 7)) {
    fieldErrors.phone = "Add a phone number we can use.";
  }
  if (input.interest && !isInterest(input.interest)) {
    fieldErrors.interest = "Choose how you'd like to list.";
  }
  if (
    input.propertyType &&
    !(propertyTypes as readonly string[]).includes(input.propertyType)
  ) {
    fieldErrors.propertyType = "Choose a property type.";
  }
  if (
    input.furnished &&
    !(furnishedLevels as readonly string[]).includes(input.furnished)
  ) {
    fieldErrors.furnished = "Choose how furnished the home is.";
  }
  if (
    input.locationId &&
    !activeLocations().some((location) => location.id === input.locationId)
  ) {
    fieldErrors.locationId = "Choose a location.";
  }
  if (input.propertyAddress.length > 500) {
    fieldErrors.propertyAddress = "Shorten the address.";
  }
  if (input.currentUse.length > 200) {
    fieldErrors.currentUse = "Shorten the current use.";
  }
  if (input.availableFrom && !datePattern.test(input.availableFrom)) {
    fieldErrors.availableFrom = "Choose a date.";
  }
  if (input.notes.length > 8000) {
    fieldErrors.notes = "Shorten the note.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true };
}

export function toOwnerLeadInsert(input: OwnerLeadInput): OwnerLeadInsert {
  const row: OwnerLeadInsert = {
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    interest: isInterest(input.interest) ? input.interest : null,
    property_type: (propertyTypes as readonly string[]).includes(input.propertyType)
      ? (input.propertyType as OwnerLeadInsert["property_type"])
      : null,
    furnished: (furnishedLevels as readonly string[]).includes(input.furnished)
      ? (input.furnished as OwnerLeadInsert["furnished"])
      : null,
    location_id: activeLocations().some((location) => location.id === input.locationId)
      ? input.locationId
      : null,
    property_address: input.propertyAddress || null,
    current_use: input.currentUse || null,
    available_from: datePattern.test(input.availableFrom) ? input.availableFrom : null,
    notes: input.notes || null,
    status: "new",
    assigned_to: null,
  };

  const source = sanitizeSource(input.source);
  if (source) row.source = source;
  return row;
}
