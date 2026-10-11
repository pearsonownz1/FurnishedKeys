"use server";

import type { InquiryActionState } from "@/lib/inquiry";
import { readInquiryForm, toInquiryInsert, validateInquiry } from "@/lib/inquiry";
import { getPublicListings } from "@/lib/listings";
import { createPublicClient } from "@/lib/supabase/public";

const initialFailure = "We couldn't send that inquiry. Please try again.";

export async function submitInquiry(
  _previous: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  const input = readInquiryForm(formData);
  const listing = (await getPublicListings()).find((item) => item.id === input.listingId);
  if (!listing) {
    return { ok: false, formError: "This home is no longer listed." };
  }

  const validated = validateInquiry(input, {
    minStayMonths: listing.min_stay_months,
    maxOccupants: listing.max_occupants,
    petsAllowed: listing.pets_allowed,
    availability: listing.availability_windows,
  });
  if (!validated.ok) {
    return { ok: false, fieldErrors: validated.fieldErrors };
  }

  // Anonymous insert only. A missing error means the row was accepted.
  // Do not read the inserted inquiry back.
  const supabase = createPublicClient();
  const { error } = await supabase.from("inquiries").insert(toInquiryInsert(input));
  if (error) {
    return { ok: false, formError: initialFailure };
  }

  return { ok: true, success: true };
}
