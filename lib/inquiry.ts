import type { AvailabilityWindow, InquiryInsert } from "@/lib/db/types";
import { stayMonthsBetween } from "@/lib/search";

export type InquiryInput = {
  listingId: string;
  moveIn: string;
  moveOut: string;
  occupants: number;
  pets: string;
  name: string;
  email: string;
  phone: string;
  message: string;
};

export type InquiryField = keyof Omit<InquiryInput, "listingId">;

export type InquiryResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors: Partial<Record<InquiryField, string>>;
      formError?: string;
    };

export type InquiryActionState = {
  ok: boolean;
  success?: boolean;
  fieldErrors?: Partial<Record<InquiryField, string>>;
  formError?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInquiry(
  input: InquiryInput,
  constraints: {
    minStayMonths: number;
    maxOccupants: number;
    petsAllowed: boolean;
    availability: AvailabilityWindow[];
  },
): InquiryResult {
  const fieldErrors: Partial<Record<InquiryField, string>> = {};

  if (!datePattern.test(input.moveIn)) {
    fieldErrors.moveIn = "Choose a move-in date.";
  }
  if (!datePattern.test(input.moveOut)) {
    fieldErrors.moveOut = "Choose a move-out date.";
  }
  if (
    datePattern.test(input.moveIn) &&
    datePattern.test(input.moveOut) &&
    input.moveOut <= input.moveIn
  ) {
    fieldErrors.moveOut = "Move-out has to be after move-in.";
  }
  if (
    !fieldErrors.moveIn &&
    !fieldErrors.moveOut &&
    stayMonthsBetween(input.moveIn, input.moveOut) < constraints.minStayMonths
  ) {
    fieldErrors.moveOut = `This home has a ${constraints.minStayMonths}-month minimum.`;
  }
  if (
    !fieldErrors.moveIn &&
    !fieldErrors.moveOut &&
    constraints.availability.length > 0 &&
    !constraints.availability.some((window) => {
      if (window.available_from > input.moveIn) return false;
      if (window.available_to && window.available_to < input.moveOut) return false;
      return true;
    })
  ) {
    fieldErrors.moveIn = "Those dates are outside the confirmed window.";
  }

  if (!Number.isInteger(input.occupants) || input.occupants < 1) {
    fieldErrors.occupants = "Add at least one person.";
  } else if (input.occupants > constraints.maxOccupants) {
    fieldErrors.occupants = `This home sleeps ${constraints.maxOccupants}.`;
  }

  if (!constraints.petsAllowed && input.pets.trim()) {
    fieldErrors.pets = "This home does not allow pets.";
  } else if (input.pets.trim().length > 500) {
    fieldErrors.pets = "Keep the pet note under 500 characters.";
  }

  const name = input.name.trim();
  if (name.length < 2 || name.length > 200) fieldErrors.name = "Add your name.";
  if (!emailPattern.test(input.email.trim()) || input.email.trim().length > 200) {
    fieldErrors.email = "Add a valid email.";
  }
  const phone = input.phone.trim();
  if (phone.replace(/\D/g, "").length < 7 || phone.length > 40) {
    fieldErrors.phone = "Add a phone number.";
  }
  const message = input.message.trim();
  if (message.length < 1) fieldErrors.message = "Add a short note for the owner.";
  else if (message.length > 8000) {
    fieldErrors.message = "Keep the note under 8,000 characters.";
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return { ok: true };
}

export function readInquiryForm(formData: FormData): InquiryInput {
  return {
    listingId: String(formData.get("listingId") ?? ""),
    moveIn: String(formData.get("moveIn") ?? ""),
    moveOut: String(formData.get("moveOut") ?? ""),
    occupants: Number(formData.get("occupants")),
    pets: String(formData.get("pets") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
}

/** Row for an anonymous insert. The caller may set `id`. The row is not read back. */
export function toInquiryInsert(input: InquiryInput): InquiryInsert {
  const pets = input.pets.trim();
  const phone = input.phone.trim();
  return {
    listing_id: input.listingId,
    renter_id: null,
    name: input.name.trim(),
    email: input.email.trim(),
    phone: phone || null,
    move_in: input.moveIn,
    move_out: input.moveOut,
    occupants: input.occupants,
    pets: pets || null,
    message: input.message.trim(),
    status: "new",
    assigned_to: null,
  };
}
