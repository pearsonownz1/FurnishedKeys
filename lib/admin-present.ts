import type { ListingStatus, OwnerLeadStatus } from "@/lib/db/types";
import { listingStatuses, ownerLeadStatuses } from "@/lib/db/types";
import { monthDay } from "@/lib/owner-dashboard";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const PACIFIC = "America/Los_Angeles";

export function greeting(now: Date, name: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: PACIFIC,
    }).format(now),
  );
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const token = name.trim().split(/\s+/)[0];
  return `Good ${part}, ${token || "there"}`;
}

export function relativeTime(iso: string | null, now: Date): string {
  if (!iso) return "—";
  const delta = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(delta)) return "—";
  if (delta < MINUTE_MS) return "Just now";
  if (delta < HOUR_MS) return `${Math.round(delta / MINUTE_MS)}m ago`;
  if (delta < DAY_MS) return `${Math.max(1, Math.round(delta / HOUR_MS))}h ago`;
  const days = Math.floor(delta / DAY_MS);
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return monthDay(iso);
}

export function submittedLabel(iso: string | null, now: Date): string {
  const when = relativeTime(iso, now);
  if (when === "—") return "Not submitted";
  if (when === "Yesterday") return "Submitted yesterday";
  if (when === "Just now") return "Submitted just now";
  return `Submitted ${when}`;
}

export function shortName(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Owner";
  if (parts.length === 1) return parts[0] ?? "Owner";
  return `${parts[0]} ${(parts.at(-1) ?? "").slice(0, 1)}.`;
}

export function measure(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : String(value);
}

export function listingStatusLabel(status: ListingStatus): string {
  if (status === "approved") return "Live";
  if (status === "pending_review") return "In review";
  if (status === "archived") return "Unpublished";
  if (status === "changes_requested") return "Changes requested";
  if (status === "rejected") return "Rejected";
  return "Draft";
}

export function leadStatusLabel(status: OwnerLeadStatus): string {
  if (status === "new") return "New";
  if (status === "contacted") return "Contacted";
  if (status === "qualified") return "Qualified";
  if (status === "onboarded") return "Onboarded";
  return "Closed";
}

export function interestLabel(interest: string | null): string {
  if (interest === "list_myself") return "List it myself";
  if (interest === "full_management") return "Full management";
  if (interest === "not_sure") return "Not sure";
  return interest?.trim() || "—";
}

export function listingStatusParam(value: string | undefined): ListingStatus | undefined {
  return listingStatuses.find((status) => status === value);
}

export function leadStatusParam(value: string | undefined): OwnerLeadStatus | undefined {
  return ownerLeadStatuses.find((status) => status === value);
}

export function roleLabel(role: string): string {
  if (!role) return "—";
  return role.slice(0, 1).toUpperCase() + role.slice(1);
}
