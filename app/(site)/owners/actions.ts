"use server";

import type { OwnerLeadActionState } from "@/lib/leads";
import { readOwnerLeadForm, toOwnerLeadInsert, validateOwnerLead } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { error } = await supabase.from("owner_leads").insert(toOwnerLeadInsert(input));
  if (error) {
    return { ok: false, formError: "We couldn't send that. Please try again." };
  }

  return { ok: true, success: true };
}
