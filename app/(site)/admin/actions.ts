"use server";

import { loadRole, sessionUser } from "@/lib/api/owner-listing";
import { performListingReview, type AdminState, type ReviewAction } from "@/lib/admin-review";
import { ownerLeadStatuses, type OwnerLeadStatus } from "@/lib/db/types";
import { publicOrigin } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";

export type { AdminState };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const NOTE_LIMIT = 4000;
const NOTES_LIMIT = 8000;
const ADMIN_ONLY = "Admins only.";
const LISTING_FAILED = "We couldn't update this listing. Please try again.";
const LEAD_MISSING = "That lead is not in the inbox.";

async function adminWriter(): Promise<
  | { ok: true; userId: string; service: NonNullable<ReturnType<typeof createServiceClient>> }
  | { ok: false; formError: string }
> {
  const { supabase, user } = await sessionUser();
  if (!user) return { ok: false, formError: ADMIN_ONLY };
  const role = await loadRole(supabase, user.id);
  if (role !== "admin") return { ok: false, formError: ADMIN_ONLY };
  const service = createServiceClient();
  if (!service) return { ok: false, formError: "We couldn't save this. Please try again." };
  return { ok: true, userId: user.id, service };
}

function listingIdFrom(formData: FormData): string | null {
  const id = String(formData.get("listingId") ?? "").trim();
  return uuidPattern.test(id) ? id : null;
}

async function review(
  listingId: string,
  action: ReviewAction,
  note: string | null,
): Promise<AdminState> {
  const gate = await adminWriter();
  if (!gate.ok) return { ok: false, formError: gate.formError };
  const result = await performListingReview({
    supabase: gate.service,
    reviewerId: gate.userId,
    listingId,
    action,
    note,
    origin: await publicOrigin(),
  });
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) return { ok: false, formError: ADMIN_ONLY };
    return { ok: false, formError: result.error || LISTING_FAILED };
  }
  return { ok: true, success: true };
}

/** Approves a listing when the submit checklist is complete, then emails the owner. */
export async function approveListing(id: string): Promise<AdminState> {
  if (!uuidPattern.test(id)) return { ok: false, formError: "Listing not found" };
  return review(id, "approve", null);
}

/** Asks for changes. `note` is required, 1 to 4000 characters, and is emailed to the owner. */
export async function requestChanges(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const listingId = listingIdFrom(formData);
  if (!listingId) return { ok: false, formError: "Listing not found" };
  const note = String(formData.get("note") ?? "").trim();
  if (note.length < 1 || note.length > NOTE_LIMIT) {
    return { ok: false, formError: "Write a note between 1 and 4000 characters." };
  }
  return review(listingId, "request_changes", note);
}

/** Rejects a listing. `note` is optional and, when present, at most 4000 characters. */
export async function rejectListing(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const listingId = listingIdFrom(formData);
  if (!listingId) return { ok: false, formError: "Listing not found" };
  const raw = String(formData.get("note") ?? "").trim();
  if (raw.length > NOTE_LIMIT) {
    return { ok: false, formError: "Keep the note under 4000 characters." };
  }
  return review(listingId, "reject", raw.length > 0 ? raw : null);
}

/** Sets owner_leads.status. Admin only. */
export async function updateLeadStatus(
  leadId: string,
  status: OwnerLeadStatus,
): Promise<AdminState> {
  if (!uuidPattern.test(leadId)) return { ok: false, formError: LEAD_MISSING };
  if (!ownerLeadStatuses.includes(status)) return { ok: false, formError: "Pick a lead status." };
  const gate = await adminWriter();
  if (!gate.ok) return { ok: false, formError: ADMIN_ONLY };
  const updated = await gate.service
    .from("owner_leads")
    .update({ status })
    .eq("id", leadId)
    .select("id");
  if (updated.error) return { ok: false, formError: "We couldn't update this lead. Please try again." };
  if (!updated.data?.length) return { ok: false, formError: LEAD_MISSING };
  return { ok: true, success: true };
}

/** Sets owner_leads.notes. An empty string clears the note. At most 8000 characters. */
export async function updateLeadNotes(leadId: string, notes: string): Promise<AdminState> {
  if (!uuidPattern.test(leadId)) return { ok: false, formError: LEAD_MISSING };
  const trimmed = notes.trim();
  if (trimmed.length > NOTES_LIMIT) {
    return { ok: false, formError: "Keep notes under 8000 characters." };
  }
  const gate = await adminWriter();
  if (!gate.ok) return { ok: false, formError: ADMIN_ONLY };
  const updated = await gate.service
    .from("owner_leads")
    .update({ notes: trimmed.length > 0 ? trimmed : null })
    .eq("id", leadId)
    .select("id");
  if (updated.error) return { ok: false, formError: "We couldn't update this lead. Please try again." };
  if (!updated.data?.length) return { ok: false, formError: LEAD_MISSING };
  return { ok: true, success: true };
}
