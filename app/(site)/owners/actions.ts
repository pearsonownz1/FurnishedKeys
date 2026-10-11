"use server";

import { deliverOwnerLeadNotice } from "@/lib/email";
import type { OwnerLeadActionState } from "@/lib/leads";
import { readOwnerLeadForm, toOwnerLeadInsert, validateOwnerLead } from "@/lib/leads";
import { createPublicClient } from "@/lib/supabase/public";
import { logInsertError } from "@/lib/writes";

export async function submitOwnerLead(
  _previous: OwnerLeadActionState,
  formData: FormData,
): Promise<OwnerLeadActionState> {
  const input = readOwnerLeadForm(formData);
  const validated = validateOwnerLead(input);
  if (!validated.ok) {
    return { ok: false, fieldErrors: validated.fieldErrors };
  }

  // Anonymous insert only. A missing error means the row was accepted.
  // Do not read the inserted lead back. Interest stays on its own column.
  const supabase = createPublicClient();
  const { error } = await supabase.from("owner_leads").insert(toOwnerLeadInsert(input));
  if (error) {
    return { ok: false, formError: logInsertError("owner_leads", error) };
  }

  try {
    await deliverOwnerLeadNotice({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      interest: input.interest || null,
      propertyType: input.propertyType || null,
      furnished: input.furnished || null,
      locationId: input.locationId || null,
      propertyAddress: input.propertyAddress || null,
      currentUse: input.currentUse || null,
      availableFrom: input.availableFrom || null,
      notes: input.notes || null,
      source: input.source,
    });
  } catch (emailError) {
    console.error(
      "owner lead email failed",
      emailError instanceof Error ? emailError.message : "error",
    );
  }

  return { ok: true, success: true };
}
