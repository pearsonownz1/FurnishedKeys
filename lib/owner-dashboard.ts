import { expandRanges } from "@/lib/calendar-ranges";
import type { ListingStatus } from "@/lib/db/types";
import { isListingStep, listingSteps, type ListingStepId } from "@/lib/listing-draft";
import { missingSubmitFields, type CompletenessInput } from "@/lib/listings/access";

export const REQUIRED_LISTING_FIELDS = 8;

/** Filter tabs: Drafts, In review, Live. All is the unfiltered list. */
export type ListingStatusGroup = "draft" | "review" | "live";

export type OwnerListingCard = {
  id: string;
  title: string | null;
  status: ListingStatus;
  cover_url: string | null;
  city: string | null;
  setup_step: ListingStepId | null;
  /** 1-based index of the resume step. Basics is 1. */
  step_index: number;
  /** Length of the wizard. Currently 10. */
  step_count: number;
  /** Label of the resume step, for "Step 2 of 10 · Rooms next". */
  next_step_label: string;
  status_group: ListingStatusGroup;
  percent_complete: number;
  resume_href: string;
  updated_at: string;
};

/**
 * Resume step for the listing card.
 * `step_index` is 1-based. `next_step_label` is that step's label, not the one after it.
 * A null or unknown `setup_step` resumes at Basics.
 * Card copy: `Step ${step_index} of ${step_count} · ${next_step_label} next`.
 */
export function listingStepProgress(setupStep: string | null): {
  step_index: number;
  step_count: number;
  next_step_label: string;
} {
  const id = isListingStep(setupStep ?? undefined) ? setupStep : "basics";
  const index = listingSteps.findIndex((step) => step.id === id);
  const step = listingSteps[index] ?? listingSteps[0];
  return {
    step_index: index >= 0 ? index + 1 : 1,
    step_count: listingSteps.length,
    next_step_label: step.label,
  };
}

/**
 * Drafts: draft, rejected, changes_requested, archived.
 * In review: pending_review. Live: approved.
 */
export function listingStatusGroup(status: ListingStatus): ListingStatusGroup {
  if (status === "approved") return "live";
  if (status === "pending_review") return "review";
  return "draft";
}

export function percentComplete(missingCount: number): number {
  const present = Math.min(REQUIRED_LISTING_FIELDS, Math.max(0, REQUIRED_LISTING_FIELDS - missingCount));
  return Math.round((present / REQUIRED_LISTING_FIELDS) * 100);
}

export function listingPercent(input: CompletenessInput): number {
  return percentComplete(missingSubmitFields(input).length);
}

/** Wizard href for the saved step. The setup page reads `step`. */
export function resumeHref(listingId: string, setupStep: string | null): string {
  const step = isListingStep(setupStep ?? undefined) ? setupStep : "basics";
  return `/owners/listings/${listingId}/setup?step=${step}`;
}

export function messageSnippet(body: string, max = 140): string {
  const one = body.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  return `${one.slice(0, max - 1)}…`;
}

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

/** Add or remove individual days. Other blocked days stay. */
export function applyBlockedDays(existing: string[], days: string[], blocked: boolean): string[] {
  const next = new Set(existing.filter((day) => dayPattern.test(day)));
  for (const day of days) {
    if (!dayPattern.test(day)) continue;
    if (blocked) next.add(day);
    else next.delete(day);
  }
  return [...next].sort();
}

export function blockedDaysInMonth(
  ranges: { start_date: string; end_date: string }[],
  month: string,
): string[] {
  const prefix = `${month}-`;
  return expandRanges(ranges).filter((day) => day.startsWith(prefix));
}

/** A stay occupies nights from move-in inclusive to move-out exclusive. */
export function stayHitsBlocked(moveIn: string, moveOut: string, blocked: string[]): boolean {
  if (!dayPattern.test(moveIn) || !dayPattern.test(moveOut) || blocked.length === 0) return false;
  const blockedSet = new Set(blocked);
  let cursor = moveIn;
  let guard = 0;
  while (cursor < moveOut && guard < 800) {
    if (blockedSet.has(cursor)) return true;
    const [year, month, day] = cursor.split("-").map(Number);
    const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1));
    cursor = date.toISOString().slice(0, 10);
    guard += 1;
  }
  return false;
}
