"use server";

import type { OwnerLeadActionState } from "@/lib/leads";
import { readOwnerLeadForm, validateOwnerLead } from "@/lib/leads";

export async function submitOwnerLead(
  _previous: OwnerLeadActionState,
  formData: FormData,
): Promise<OwnerLeadActionState> {
  const input = readOwnerLeadForm(formData);
  const validated = validateOwnerLead(input);
  if (!validated.ok) {
    return { ok: false, fieldErrors: validated.fieldErrors };
  }

  // TODO: Persist to owner_leads when Backend's table is ready. Do not insert yet.
  return { ok: true, success: true };
}
