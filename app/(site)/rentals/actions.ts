"use server";

import { cookies } from "next/headers";
import { deliverInquiryNotice } from "@/lib/email";
import type { InquiryActionState } from "@/lib/inquiry";
import { readInquiryForm, toInquiryInsert, validateInquiry } from "@/lib/inquiry";
import { getPublicListings } from "@/lib/listings";
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

  const validated = validateInquiry(input, {
    minStayMonths: listing.min_stay_months,
    maxOccupants: listing.max_occupants,
    petsAllowed: listing.pets_allowed,
    availability: listing.availability_windows,
  });
  if (!validated.ok) {
    return { ok: false, fieldErrors: validated.fieldErrors };
  }

  // Anonymous insert only. The id is chosen here so the owner email can link
  // to the inquiry. Do not read the inserted inquiry back.
  const inquiryId = crypto.randomUUID();
  const supabase = createPublicClient();
  const { error } = await supabase
    .from("inquiries")
    .insert({ ...toInquiryInsert(input), id: inquiryId });
  if (error) {
    return { ok: false, formError: logInsertError("inquiries", error) };
  }

  try {
    const sent = await deliverInquiryNotice({
      ownerId: listing.owner_id,
      listingTitle: listing.title,
      inquiryId,
      renterName: input.name.trim(),
      renterEmail: input.email.trim(),
      moveIn: input.moveIn,
      moveOut: input.moveOut,
      occupants: input.occupants,
      pets: input.pets.trim() || null,
      message: input.message.trim(),
    });
    if (process.env.VERCEL_ENV === "preview") {
      const jar = await cookies();
      jar.set("fk_email_result", sent.detail, { httpOnly: true, path: "/", maxAge: 180, sameSite: "lax" });
    }
  } catch (emailError) {
    console.error(
      "inquiry email failed",
      emailError instanceof Error ? emailError.message : "error",
    );
  }

  return { ok: true, success: true };
}
