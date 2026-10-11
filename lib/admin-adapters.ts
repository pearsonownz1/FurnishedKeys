"use server";

import { revalidatePath } from "next/cache";
import { loadRole, sessionUser } from "@/lib/api/owner-listing";
import type { LeadStatusChange, PublicationChange } from "@/lib/admin-console";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Pause, unpublish, and resume have no listing status to write yet.
 * `archived` is only a readable stand-in for the Paused filter.
 */
export async function setListingPublication(
  change: PublicationChange,
): Promise<{ ok: false; formError: string }> {
  void change;
  return { ok: false, formError: "Pause and unpublish are not available yet." };
}

/**
 * The database enum is new | contacted | closed.
 * Called, signed, and not interested are not writable until that enum grows.
 */
export async function setLeadStatus(change: LeadStatusChange): Promise<{ ok: false; formError: string }> {
  void change;
  return { ok: false, formError: "Lead status changes are not available yet." };
}

export async function saveLeadNotes(
  id: string,
  notes: string,
): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!uuidPattern.test(id)) return { ok: false, formError: "Lead not found." };
  const trimmed = notes.trim();
  if (trimmed.length > 2000) return { ok: false, formError: "Notes must be 2000 characters or fewer." };

  const { supabase, user } = await sessionUser();
  if (!user) return { ok: false, formError: "Sign in required." };
  const role = await loadRole(supabase, user.id);
  if (role !== "admin") return { ok: false, formError: "Not authorized." };

  const updated = await supabase
    .from("owner_leads")
    .update({ notes: trimmed ? trimmed : null })
    .eq("id", id);
  if (updated.error) return { ok: false, formError: updated.error.message };
  revalidatePath("/admin/leads");
  return { ok: true };
}
