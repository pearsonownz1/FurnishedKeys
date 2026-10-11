import type { ListingStatus } from "@/lib/db/types";

export type BoardStatus = "live" | "in_review" | "changes_requested" | "draft" | "rejected";

export type BoardListing = {
  id: string;
  title: string;
  area: string;
  status: BoardStatus;
  paidAt: string | null;
  feePaidThrough: string | null;
  renewalCanceled: boolean;
  adminNote: string | null;
  lastConfirmedAt: string | null;
};

export type BoardInquiry = {
  id: string;
  listingTitle: string;
  name: string;
  message: string;
  createdAt: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function boardStatus(status: ListingStatus): BoardStatus {
  if (status === "approved") return "live";
  if (status === "pending_review") return "in_review";
  if (status === "changes_requested") return "changes_requested";
  if (status === "rejected") return "rejected";
  return "draft";
}

export function statusLabel(status: BoardStatus): string {
  switch (status) {
    case "live":
      return "Live";
    case "in_review":
      return "In review";
    case "changes_requested":
      return "Changes requested";
    case "draft":
      return "Draft";
    case "rejected":
      return "Rejected";
  }
}

export function formatMonthDayYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function confirmationIsStale(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const confirmed = new Date(iso).getTime();
  if (Number.isNaN(confirmed)) return false;
  return now.getTime() - confirmed >= 14 * DAY_MS;
}

export function confirmationBanner(listings: Pick<BoardListing, "lastConfirmedAt">[], now: Date): string | null {
  const stale = listings.some((listing) => confirmationIsStale(listing.lastConfirmedAt, now));
  if (!stale) return null;
  return "Confirm availability. At least one listing was last confirmed more than 14 days ago.";
}

export function noteRequired(note: string): string | null {
  return note.trim() ? null : "Add a note before you continue.";
}
