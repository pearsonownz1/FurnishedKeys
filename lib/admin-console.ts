import type { InquiryStatus, ListingStatus, OwnerLeadInterest, OwnerLeadStatus } from "@/lib/db/types";
import { monthDay } from "@/lib/owner-dashboard";

export const PACIFIC = "America/Los_Angeles";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export type AdminStaff = {
  name: string;
  email: string;
  initials: string;
};

export type ListingCheck = {
  ok: boolean;
  label: string;
};

export type AdminPhoto = {
  src: string;
  alt: string;
};

export type AdminReview = {
  id: string;
  title: string;
  ownerName: string;
  city: string;
  submittedAt: string;
  coverUrl: string | null;
  description: string | null;
  monthlyRentCents: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  minStayMonths: number;
  photos: AdminPhoto[];
  checks: ListingCheck[];
};

export type ActivityPiece = {
  text: string;
  strong?: boolean;
};

export type ActivityItem = {
  id: string;
  at: string;
  pieces: ActivityPiece[];
};

export type ActivityView = {
  id: string;
  at: string;
  when: string;
  pieces: ActivityPiece[];
};

export type LeadUiStatus = "new" | "called" | "signed" | "not_interested" | "closed";
export type LeadTab = "all" | "new" | "called" | "signed" | "not_interested";
export type LeadStatusValue = "new" | "called" | "signed" | "not_interested";

export type AdminLead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  sourceLabel: string;
  interestLabel: string;
  status: LeadUiStatus;
  notes: string;
};

export type ListingBucket = "draft" | "review" | "live" | "paused";
export type ListingTab = "all" | ListingBucket;

export type AdminListingRow = {
  id: string;
  title: string;
  ownerName: string;
  city: string;
  bucket: ListingBucket;
  updatedAt: string;
};

export type InquiryTab = "all" | "unreplied" | "replied";

export type AdminInquiry = {
  id: string;
  name: string;
  listingTitle: string;
  email: string;
  phone: string | null;
  reply: "unreplied" | "replied";
  receivedAt: string;
};

export type UserTab = "all" | "owner" | "renter";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "renter";
  joinedAt: string;
  listingCount: number;
  inquiryCount: number;
};

export type AdminConsole = {
  staff: AdminStaff;
  waiting: number;
  live: number;
  newLeads: number;
  letterLeads: number;
  inquiriesThisWeek: number;
  newSignups: number;
  queue: AdminReview[];
  activity: ActivityItem[];
  leads: AdminLead[];
  listings: AdminListingRow[];
  inquiries: AdminInquiry[];
  users: AdminUser[];
};

export type PublicationAction = "pause" | "unpublish" | "resume";
export type PublicationChange = {
  listingId: string;
  action: PublicationAction;
};
export type LeadStatusChange = {
  id: string;
  status: LeadStatusValue;
};

export type CheckInput = {
  photoCount: number;
  hasCover: boolean;
  monthlyRentCents: number | null;
  feeCount: number;
  hasAddress: boolean;
  calendarConfirmed: boolean;
  houseRules: string | null;
};

export type ActivitySource = {
  inquiries: { id: string; title: string; at: string }[];
  replies: { id: string; title: string; at: string }[];
  submissions: { id: string; name: string; at: string }[];
  letterLeads: { id: string; at: string }[];
  owners: { id: string; at: string }[];
  calendars: { id: string; title: string; at: string }[];
};

type PacificParts = {
  year: string;
  month: string;
  day: string;
  weekday: string;
  hour: string;
  minute: string;
  second: string;
};

function pacificParts(date: Date): PacificParts {
  const bag: Partial<PacificParts> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)) {
    if (part.type !== "literal") bag[part.type as keyof PacificParts] = part.value;
  }
  return {
    year: bag.year ?? "1970",
    month: bag.month ?? "01",
    day: bag.day ?? "01",
    weekday: bag.weekday ?? "Mon",
    hour: bag.hour ?? "00",
    minute: bag.minute ?? "00",
    second: bag.second ?? "00",
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function pacificYmd(date: Date): string {
  const parts = pacificParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function pacificHour(date: Date): number {
  return Number(pacificParts(date).hour);
}

/** Monday 00:00 America/Los_Angeles, returned as a UTC instant. */
export function pacificWeekStart(now: Date): Date {
  const parts = pacificParts(now);
  const index = WEEKDAY_INDEX[parts.weekday] ?? 0;
  const monday = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - index));
  const ymd = `${monday.getUTCFullYear()}-${pad(monday.getUTCMonth() + 1)}-${pad(monday.getUTCDate())}`;
  return pacificMidnight(ymd);
}

function pacificMidnight(ymd: string): Date {
  let guess = new Date(`${ymd}T08:00:00Z`).getTime();
  const target = new Date(`${ymd}T00:00:00Z`).getTime();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const shown = pacificParts(new Date(guess));
    const shownAsUtc = Date.UTC(
      Number(shown.year),
      Number(shown.month) - 1,
      Number(shown.day),
      Number(shown.hour),
      Number(shown.minute),
      Number(shown.second),
    );
    const delta = target - shownAsUtc;
    guess += delta;
    if (delta === 0) break;
  }
  return new Date(guess);
}

export function greeting(now: Date, name: string): string {
  const hour = pacificHour(now);
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const token = name.trim().split(/\s+/)[0];
  return `Good ${part}, ${token || "there"}`;
}

export function submittedLabel(iso: string, now: Date): string {
  const delta = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(delta) || delta < MINUTE_MS) return "Submitted just now";
  if (delta < HOUR_MS) return `Submitted ${Math.round(delta / MINUTE_MS)}m ago`;
  if (delta < DAY_MS) {
    const hours = Math.max(1, Math.round(delta / HOUR_MS));
    return `Submitted ${hours}h ago`;
  }
  const days = Math.floor(delta / DAY_MS);
  if (days === 1) return "Submitted yesterday";
  return `Submitted ${days} days ago`;
}

export function activityWhen(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (pacificYmd(date) === pacificYmd(now)) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: PACIFIC,
    }).format(date);
  }
  const [year, month, day] = pacificYmd(now).split("-").map(Number);
  const yesterday = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) - 1));
  const yesterdayYmd = `${yesterday.getUTCFullYear()}-${pad(yesterday.getUTCMonth() + 1)}-${pad(yesterday.getUTCDate())}`;
  if (pacificYmd(date) === yesterdayYmd) return "Yesterday";
  return monthDay(iso);
}

export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Owner";
  if (parts.length === 1) return parts[0] ?? "Owner";
  const last = parts.at(-1) ?? "";
  return `${parts[0]} ${last.slice(0, 1)}.`;
}

export function queueMeta(ownerName: string, city: string, submittedAt: string, now: Date): string {
  return [shortName(ownerName), city, submittedLabel(submittedAt, now)].filter(Boolean).join(" · ");
}

export function listingBucket(status: ListingStatus): ListingBucket {
  if (status === "approved") return "live";
  if (status === "pending_review") return "review";
  if (status === "archived") return "paused";
  return "draft";
}

export function bucketLabel(bucket: ListingBucket): string {
  if (bucket === "review") return "In review";
  if (bucket === "live") return "Live";
  if (bucket === "paused") return "Paused";
  return "Draft";
}

export function leadSourceLabel(source: string): string {
  return source === "letter" ? "Letter (QR)" : "/owners";
}

export function leadInterestLabel(interest: OwnerLeadInterest | null): string {
  if (interest === "list_myself") return "List it myself";
  if (interest === "full_management") return "Full management";
  if (interest === "not_sure") return "Not sure";
  return "—";
}

/** Read mapping. `closed` stays Closed. Called, signed, and not interested are not stored. */
export function leadUiStatus(status: OwnerLeadStatus): LeadUiStatus {
  if (status === "new") return "new";
  if (status === "contacted") return "called";
  return "closed";
}

export function leadStatusLabel(status: LeadUiStatus): string {
  if (status === "new") return "New";
  if (status === "called") return "Called";
  if (status === "signed") return "Signed";
  if (status === "not_interested") return "Not interested";
  return "Closed";
}

export function leadTab(value: string | undefined): LeadTab {
  if (value === "new" || value === "called" || value === "signed" || value === "not_interested") return value;
  return "all";
}

export function matchesLeadTab(status: LeadUiStatus, tab: LeadTab): boolean {
  return tab === "all" || status === tab;
}

export function leadTabCounts(leads: { status: LeadUiStatus }[]) {
  return {
    all: leads.length,
    new: leads.filter((lead) => lead.status === "new").length,
    called: leads.filter((lead) => lead.status === "called").length,
    signed: leads.filter((lead) => lead.status === "signed").length,
    not_interested: leads.filter((lead) => lead.status === "not_interested").length,
  };
}

export function listingTab(value: string | undefined): ListingTab {
  if (value === "draft" || value === "review" || value === "live" || value === "paused") return value;
  return "all";
}

export function listingTabCounts(rows: { bucket: ListingBucket }[]) {
  return {
    all: rows.length,
    draft: rows.filter((row) => row.bucket === "draft").length,
    review: rows.filter((row) => row.bucket === "review").length,
    live: rows.filter((row) => row.bucket === "live").length,
    paused: rows.filter((row) => row.bucket === "paused").length,
  };
}

export function inquiryReply(status: InquiryStatus): "unreplied" | "replied" {
  return status === "new" ? "unreplied" : "replied";
}

export function inquiryTab(value: string | undefined): InquiryTab {
  if (value === "unreplied" || value === "replied") return value;
  return "all";
}

export function inquiryTabCounts(rows: { reply: "unreplied" | "replied" }[]) {
  return {
    all: rows.length,
    unreplied: rows.filter((row) => row.reply === "unreplied").length,
    replied: rows.filter((row) => row.reply === "replied").length,
  };
}

export function userTab(value: string | undefined): UserTab {
  if (value === "owner" || value === "renter") return value;
  return "all";
}

export function userTabCounts(rows: { role: "owner" | "renter" }[]) {
  return {
    all: rows.length,
    owner: rows.filter((row) => row.role === "owner").length,
    renter: rows.filter((row) => row.role === "renter").length,
  };
}

export function listingChecks(input: CheckInput): ListingCheck[] {
  const photos = input.photoCount === 1 ? "1 photo" : `${input.photoCount} photos`;
  const photo: ListingCheck =
    input.photoCount === 0
      ? { ok: false, label: "No photos yet" }
      : input.hasCover
        ? { ok: true, label: `${photos}, cover set` }
        : { ok: false, label: "No cover photo yet" };
  return [
    photo,
    input.monthlyRentCents != null && input.feeCount > 0
      ? { ok: true, label: "Rent and every fee listed" }
      : { ok: false, label: "Rent or a fee is missing" },
    input.hasAddress
      ? { ok: true, label: "Address verified, kept private" }
      : { ok: false, label: "Address not on file" },
    input.calendarConfirmed
      ? { ok: true, label: "Calendar confirmed" }
      : { ok: false, label: "Calendar not confirmed" },
    input.houseRules?.trim()
      ? { ok: true, label: "House rules added" }
      : { ok: false, label: "No house rules yet" },
  ];
}

export function measure(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : String(value);
}

export function composeActivity(source: ActivitySource, limit = 8): ActivityItem[] {
  const lines: ActivityItem[] = [];
  for (const row of source.inquiries) {
    lines.push({
      id: `inquiry-${row.id}`,
      at: row.at,
      pieces: [{ text: "New inquiry on " }, { text: row.title, strong: true }],
    });
  }
  for (const row of source.replies) {
    lines.push({
      id: `reply-${row.id}`,
      at: row.at,
      pieces: [{ text: "Owner replied to an inquiry on " }, { text: row.title, strong: true }],
    });
  }
  for (const row of source.submissions) {
    lines.push({
      id: `submit-${row.id}`,
      at: row.at,
      pieces: [{ text: row.name, strong: true }, { text: " submitted a listing for review" }],
    });
  }
  for (const row of source.letterLeads) {
    lines.push({
      id: `letter-${row.id}`,
      at: row.at,
      pieces: [{ text: "New owner lead from the letter (QR)" }],
    });
  }
  for (const row of source.calendars) {
    lines.push({
      id: `calendar-${row.id}`,
      at: row.at,
      pieces: [{ text: "Calendar updated on " }, { text: row.title, strong: true }],
    });
  }

  const owners = new Map<string, { count: number; at: string }>();
  for (const owner of source.owners) {
    const when = new Date(owner.at);
    if (Number.isNaN(when.getTime())) continue;
    const key = pacificYmd(when);
    const existing = owners.get(key);
    if (!existing) {
      owners.set(key, { count: 1, at: owner.at });
      continue;
    }
    owners.set(key, {
      count: existing.count + 1,
      at: owner.at > existing.at ? owner.at : existing.at,
    });
  }
  for (const [key, group] of owners) {
    lines.push({
      id: `owners-${key}`,
      at: group.at,
      pieces: [
        {
          text: group.count === 1 ? "1 new owner account" : `${group.count} new owner accounts`,
        },
      ],
    });
  }

  return lines
    .filter((line) => !Number.isNaN(new Date(line.at).getTime()))
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, limit);
}

export function presentActivity(items: ActivityItem[], now: Date): ActivityView[] {
  return items.map((item) => ({
    id: item.id,
    at: item.at,
    when: activityWhen(item.at, now),
    pieces: item.pieces,
  }));
}
