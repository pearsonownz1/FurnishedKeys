"use server";

import { deliverInquiryNotice } from "@/lib/email";
import type { InquiryActionState } from "@/lib/inquiry";
import { readInquiryForm, toInquiryInsert, validateInquiry } from "@/lib/inquiry";
import { expandRanges } from "@/lib/calendar-ranges";
import { getPublicListings } from "@/lib/listings";
import { newRenterToken } from "@/lib/renter-token";
import { createPublicClient } from "@/lib/supabase/public";
import { logInsertError } from "@/lib/writes";

export async function submitInquiry(
  _previous: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  const input = readInquiryForm(formData);
  const listing = (await getPublicListings()).find((item) => item.id === input.listingId);
  if (!listing) {
    return { ok: false, formError: "This home is no longer listed." };
  }
  if (listing.is_demo) {
    return {
      ok: false,
      formError:
        "This is a sample listing, so it can't take inquiries. Browse real homes at /rentals.",
    };
  }

  const validated = validateInquiry(input, {
    minStayMonths: listing.min_stay_months,
    maxOccupants: listing.max_occupants,
    petsAllowed: listing.pets_allowed,
    availability: listing.availability_windows,
    blockedDates: expandRanges(listing.blocked_dates ?? []),
  });
  if (!validated.ok) {
    return { ok: false, fieldErrors: validated.fieldErrors };
  }

  // Anonymous insert only. The id is chosen here so the owner email can link
  // to the inquiry. Do not read the inserted inquiry back.
  const inquiryId = crypto.randomUUID();
  const token = newRenterToken();
  const supabase = createPublicClient();
  const { error } = await supabase.from("inquiries").insert({
    ...toInquiryInsert(input),
    id: inquiryId,
    renter_token_hash: token.hash,
  });
  if (error) {
    return { ok: false, formError: logInsertError("inquiries", error) };
  }

  try {
    await deliverInquiryNotice({
      ownerId: listing.owner_id,
      listingTitle: listing.title,
      inquiryId,
      renterName: input.name.trim(),
      renterEmail: input.email.trim(),
      renterPhone: input.phone.trim() || null,
      moveIn: input.moveIn,
      moveOut: input.moveOut,
      occupants: input.occupants,
      pets: input.pets.trim() || null,
      message: input.message.trim(),
    });
  } catch (emailError) {
    console.error(
      "inquiry email failed",
      emailError instanceof Error ? emailError.message : "error",
    );
  }

  return { ok: true, success: true };
}
