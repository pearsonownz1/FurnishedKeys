import type { InquiryStatus, ListingStatus } from "@/lib/db/types";
import { expandRanges } from "@/lib/calendar-ranges";
import { isListingStep, listingSteps, type ListingStepId } from "@/lib/listing-draft";
import { missingSubmitFields, type CompletenessInput } from "@/lib/listings/access";
import type { BoardStatus } from "@/lib/owner-board";

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

export const DASHBOARD_STEP_TOTAL = 5;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Five groups over the existing setup steps. Photos is group 2, matching the dashboard comp. */
const groupOf: Record<Exclude<ListingStepId, "review">, number> = {
  basics: 1,
  rooms: 1,
  photos: 2,
  description: 3,
  goodFor: 3,
  amenities: 3,
  rent: 4,
  availability: 5,
  rules: 5,
};

export type SetupSignals = {
  title: string | null;
  bedroomCount: number;
  bathrooms: number | null;
  photoCount: number;
  description: string | null;
  goodFor: readonly string[];
  amenities: readonly string[];
  monthlyRentCents: number | null;
  availableFrom: string | null;
  houseRules: string | null;
  petPolicy: string | null;
  petsAllowed: boolean;
  smokingAllowed: boolean;
};

export type SetupProgress = {
  step: number;
  total: 5;
  percent: number;
  nextLabel: string | null;
  complete: boolean;
  setupStep: ListingStepId;
};

export type ListingFilter = "all" | "drafts" | "review" | "live";

export type ListingAction = {
  label: string;
  href: string;
  tone: "primary" | "secondary";
};

export type InquiryThreadMessage = {
  id: string;
  body: string;
  from: "owner" | "renter";
  name: string;
  timeLabel: string;
  emailed?: boolean;
};

export type DashboardOwner = {
  name: string;
  email: string;
  phone: string;
  initials: string;
  notifyNewInquiry: boolean;
  notifyNewMessage: boolean;
  notifyListingStatus: boolean;
};

export function setupStepFilled(id: ListingStepId, signals: SetupSignals): boolean {
  switch (id) {
    case "basics":
      return Boolean(signals.title?.trim());
    case "rooms":
      return signals.bedroomCount >= 1 && signals.bathrooms != null && signals.bathrooms > 0;
    case "photos":
      return signals.photoCount >= 1;
    case "description":
      return Boolean(signals.description?.trim());
    case "goodFor":
      return signals.goodFor.length > 0;
    case "amenities":
      return signals.amenities.length > 0;
    case "rent":
      return signals.monthlyRentCents != null && signals.monthlyRentCents > 0;
    case "availability":
      return Boolean(signals.availableFrom);
    case "rules":
      return Boolean(
        signals.houseRules?.trim() ||
          signals.petPolicy?.trim() ||
          signals.petsAllowed ||
          signals.smokingAllowed,
      );
    case "review":
      return listingSteps
        .filter((step) => step.id !== "review")
        .every((step) => setupStepFilled(step.id, signals));
  }
}

export function setupProgress(signals: SetupSignals): SetupProgress {
  const next = listingSteps.find((step) => step.id !== "review" && !setupStepFilled(step.id, signals));
  if (!next || next.id === "review") {
    return {
      step: DASHBOARD_STEP_TOTAL,
      total: DASHBOARD_STEP_TOTAL,
      percent: 100,
      nextLabel: null,
      complete: true,
      setupStep: "review",
    };
  }
  const step = groupOf[next.id];
  return {
    step,
    total: DASHBOARD_STEP_TOTAL,
    percent: (step / DASHBOARD_STEP_TOTAL) * 100,
    nextLabel: next.label,
    complete: false,
    setupStep: next.id,
  };
}

export function progressCaption(progress: SetupProgress): string {
  if (progress.complete || !progress.nextLabel) return "Ready to submit";
  return `Step ${progress.step} of ${progress.total} · ${progress.nextLabel} next`;
}

export function listingFilter(value: string | undefined): ListingFilter {
  if (value === "drafts" || value === "review" || value === "live" || value === "all") return value;
  return "all";
}

export function matchesListingFilter(group: ListingStatusGroup, filter: ListingFilter): boolean {
  if (filter === "all") return true;
  if (filter === "drafts") return group === "draft";
  if (filter === "review") return group === "review";
  return group === "live";
}

export function filterCounts(listings: { statusGroup: ListingStatusGroup }[]) {
  return {
    all: listings.length,
    drafts: listings.filter((listing) => matchesListingFilter(listing.statusGroup, "drafts")).length,
    review: listings.filter((listing) => matchesListingFilter(listing.statusGroup, "review")).length,
    live: listings.filter((listing) => matchesListingFilter(listing.statusGroup, "live")).length,
  };
}

/** Card line from the loader's step fields. */
export function stepCaption(stepIndex: number, stepCount: number, nextStepLabel: string): string {
  return `Step ${stepIndex} of ${stepCount} · ${nextStepLabel} next`;
}

export function listingDetailLine(listing: {
  status: BoardStatus;
  city: string;
  typeLabel: string;
  bedLabel: string | null;
  rentLabel: string | null;
}): string {
  if (listing.status === "draft") {
    return [listing.city, listing.typeLabel].filter(Boolean).join(" · ");
  }
  const line = [listing.city, listing.bedLabel, listing.rentLabel].filter(Boolean).join(" · ");
  return line || [listing.city, listing.typeLabel].filter(Boolean).join(" · ");
}

export function listingStatusCaption(input: {
  status: BoardStatus;
  progress: SetupProgress;
  submittedOn: string | null;
  confirmedAgo: string | null;
  inquiryCount: number;
  adminNote: string | null;
}): string {
  if (input.status === "draft") return progressCaption(input.progress);
  if (input.status === "in_review") {
    const when = input.submittedOn ? `Submitted ${input.submittedOn}` : "Submitted";
    return `${when} · usually 1 business day`;
  }
  if (input.status === "changes_requested") return input.adminNote?.trim() || "Changes requested";
  if (input.status === "rejected") return "This listing was not approved";
  const when = input.confirmedAgo ? `Calendar confirmed ${input.confirmedAgo}` : "Calendar not confirmed";
  const noun = input.inquiryCount === 1 ? "inquiry" : "inquiries";
  return `${when} · ${input.inquiryCount} ${noun}`;
}

export function listingActions(listing: {
  id: string;
  statusGroup: ListingStatusGroup;
  slug: string | null;
  resumeHref: string;
}): { cardHref: string; actions: ListingAction[] } {
  if (listing.statusGroup === "draft") {
    return {
      cardHref: listing.resumeHref,
      actions: [{ label: "Continue setup", href: listing.resumeHref, tone: "primary" }],
    };
  }
  if (listing.statusGroup === "review") {
    const view = listing.slug ? `/rentals/${listing.slug}` : listing.resumeHref;
    return {
      cardHref: view,
      actions: [{ label: "View", href: view, tone: "secondary" }],
    };
  }
  return {
    cardHref: listing.resumeHref,
    actions: [
      { label: "Edit", href: listing.resumeHref, tone: "secondary" },
      { label: "Confirm dates", href: `/owner/calendar?listing=${listing.id}`, tone: "secondary" },
    ],
  };
}

export function listTime(iso: string, now: Date): string {
  const delta = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(delta)) return "";
  if (delta < HOUR_MS) return `${Math.max(1, Math.round(delta / MINUTE_MS))}m`;
  if (delta < DAY_MS) return `${Math.max(1, Math.round(delta / HOUR_MS))}h`;
  if (delta < 2 * DAY_MS) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(iso));
}

export function agoLabel(iso: string, now: Date): string {
  const short = listTime(iso, now);
  if (short.endsWith("m") || short.endsWith("h")) return `${short} ago`;
  return short;
}

export function confirmedAgo(iso: string | null, now: Date): string | null {
  if (!iso) return null;
  const delta = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < 0) return null;
  const days = Math.floor(delta / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function monthDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(date);
}

export function stayRange(moveIn: string, moveOut: string | null): string {
  const start = shortUtcDate(moveIn);
  if (!start) return "";
  if (!moveOut) return `${start} – Open`;
  const end = shortUtcDate(moveOut);
  return end ? `${start} – ${end}` : start;
}

export function firstName(name: string): string {
  const token = name.trim().split(/\s+/)[0];
  return token || "them";
}

export function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  if (parts[0] && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  const local = email.trim().replace(/@.*/, "").slice(0, 2);
  return (local || "FK").toUpperCase();
}

export function occupantLabel(count: number): string {
  return count === 1 ? "1 occupant" : `${count} occupants`;
}

export function petsLabel(pets: string | null): string {
  return pets?.trim() || "No pets";
}

export function clip(text: string, max = 72): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

export function threadMessages(input: {
  inquiryId: string;
  body: string;
  createdAt: string;
  renterName: string;
  ownerId: string;
  replies: { id: string; body: string; createdAt: string; senderId: string | null }[];
  now: Date;
}): InquiryThreadMessage[] {
  const name = firstName(input.renterName);
  const original: InquiryThreadMessage = {
    id: `${input.inquiryId}-inquiry`,
    body: input.body,
    from: "renter",
    name,
    timeLabel: agoLabel(input.createdAt, input.now),
  };
  const replies = [...input.replies]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((message) => {
      const owner = message.senderId === input.ownerId;
      return {
        id: message.id,
        body: message.body,
        from: owner ? ("owner" as const) : ("renter" as const),
        name: owner ? "You" : name,
        timeLabel: agoLabel(message.createdAt, input.now),
        ...(owner ? { emailed: true } : {}),
      };
    });
  return [original, ...replies];
}

export function inquiryPreview(messages: InquiryThreadMessage[]): string {
  const last = messages.at(-1);
  if (!last) return "";
  const text = clip(last.body);
  return last.from === "owner" ? `You: ${text}` : text;
}

function shortUtcDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function inquiryStatusTone(status: InquiryStatus): string {
  if (status === "responded") return "bg-pine-l text-pine-d";
  if (status === "closed" || status === "declined") return "bg-stone text-muted";
  return "bg-[#f4ead8] text-warn";
}

export function messagesFromThread(input: {
  inquiryId: string;
  message: string;
  renterName: string;
  messages: {
    id: string;
    sender_role: "owner" | "renter";
    body: string;
    created_at: string;
    emailed: boolean;
  }[];
  now: Date;
}): InquiryThreadMessage[] {
  const name = firstName(input.renterName);
  const rest = input.messages.map((message) => ({
    id: message.id,
    body: message.body,
    from: message.sender_role,
    name: message.sender_role === "owner" ? "You" : name,
    timeLabel: agoLabel(message.created_at, input.now),
    ...(message.emailed ? { emailed: true } : {}),
  }));
  const opening = input.message.trim();
  const first = rest[0];
  if (!opening || (first?.from === "renter" && first.body.trim() === opening)) return rest;
  return [
    {
      id: `${input.inquiryId}-inquiry`,
      body: input.message,
      from: "renter",
      name,
      timeLabel: "",
    },
    ...rest,
  ];
}

export type DashboardListing = {
  id: string;
  title: string;
  city: string;
  status: BoardStatus;
  statusGroup: ListingStatusGroup;
  typeLabel: string;
  bedLabel: string | null;
  rentLabel: string | null;
  coverUrl: string | null;
  slug: string | null;
  stepIndex: number;
  stepCount: number;
  nextStepLabel: string;
  percentComplete: number;
  resumeHref: string;
  caption: string;
  inquiryCount: number;
  lastConfirmedAt: string | null;
};

export type DashboardInquiry = {
  id: string;
  listingId: string;
  listingTitle: string;
  name: string;
  firstName: string;
  email: string;
  phone: string | null;
  status: InquiryStatus;
  createdAt: string;
  listTime: string;
  dateLabel: string;
  occupantLabel: string;
  petsLabel: string;
  preview: string;
  unread: boolean;
  messages: InquiryThreadMessage[];
};

export type OwnerDashboardData = {
  signedIn: boolean;
  owner: DashboardOwner;
  locationId: string;
  listings: DashboardListing[];
  inquiries: DashboardInquiry[];
  unread: number;
  counts: ReturnType<typeof filterCounts>;
};
