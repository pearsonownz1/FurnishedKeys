import { cache } from "react";
import { sessionUser } from "@/lib/api/owner-listing";
import type { InquiryStatus, ListingStatus } from "@/lib/db/types";
import { listingOwnerColumns } from "@/lib/db/types";
import { isListingStep, type ListingStepId } from "@/lib/listing-draft";
import { locationById, primaryLocation } from "@/lib/locations";
import { fixtureDashboard } from "@/lib/owner-dashboard-fixtures";
import {
  blockedDaysInMonth,
  filterCounts,
  firstName,
  initials,
  listingPercent,
  listingStatusGroup,
  listingStepProgress,
  listTime,
  messageSnippet,
  monthDay,
  occupantLabel,
  petsLabel,
  resumeHref,
  stayRange,
  stepCaption,
  type DashboardInquiry,
  type DashboardListing,
  type OwnerDashboardData,
  type OwnerListingCard,
} from "@/lib/owner-dashboard";
import { boardStatus } from "@/lib/owner-board";
import { LISTING_PHOTOS_BUCKET, LISTING_PHOTO_TTL_SECONDS } from "@/lib/photos";

export type InboxInquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  move_in: string;
  move_out: string | null;
  occupants: number;
  pets: string | null;
  status: InquiryStatus;
  listing_title: string;
  last_message_snippet: string;
  unread_count: number;
  last_message_at: string | null;
};

export type ThreadMessage = {
  id: string;
  sender_role: "owner" | "renter";
  body: string;
  /** True once Resend accepted the email to the other party. */
  emailed: boolean;
  created_at: string;
};

export type OwnerInbox = {
  inquiries: InboxInquiry[];
  /** Sum of owner_unread, including declined threads. */
  unread_total: number;
};

const emptyInbox: OwnerInbox = { inquiries: [], unread_total: 0 };

export type OwnerThread = {
  inquiry: {
    id: string;
    listing_id: string;
    name: string;
    email: string;
    phone: string | null;
    move_in: string;
    move_out: string | null;
    occupants: number;
    pets: string | null;
    status: InquiryStatus;
    message: string;
    listing_title: string;
    owner_unread: number;
  };
  messages: ThreadMessage[];
};

export type CalendarMonth = {
  listing_id: string;
  month: string;
  blocked_days: string[];
  availability: {
    id: string;
    available_from: string;
    available_to: string | null;
  }[];
};

export type SettingsProfile = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  notify_new_inquiry: boolean;
  notify_new_message: boolean;
  notify_listing_status: boolean;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const monthPattern = /^\d{4}-\d{2}$/;

/** Owner inquiries, newest activity first, plus the menu badge count. Empty when signed out. */
export async function loadInbox(): Promise<OwnerInbox> {
  const { supabase, user } = await sessionUser();
  if (!user) return emptyInbox;

  const listings = await supabase.from("listings").select("id, title").eq("owner_id", user.id);
  if (listings.error || !listings.data?.length) return emptyInbox;
  const titles = new Map(listings.data.map((row) => [row.id, row.title?.trim() || "Untitled listing"]));
  const ids = [...titles.keys()];

  const inquiries = await supabase
    .from("inquiries")
    .select(
      "id, listing_id, name, email, phone, move_in, move_out, occupants, pets, status, message, owner_unread, last_message_at",
    )
    .in("listing_id", ids)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (inquiries.error || !inquiries.data?.length) return emptyInbox;

  const inquiryIds = inquiries.data.map((row) => row.id);
  const messages = await supabase
    .from("messages")
    .select("inquiry_id, body, created_at")
    .in("inquiry_id", inquiryIds)
    .order("created_at", { ascending: false });
  const latest = new Map<string, string>();
  for (const message of messages.data ?? []) {
    if (!latest.has(message.inquiry_id)) latest.set(message.inquiry_id, message.body);
  }

  const rows = inquiries.data.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    move_in: row.move_in,
    move_out: row.move_out,
    occupants: row.occupants,
    pets: row.pets,
    status: row.status,
    listing_title: titles.get(row.listing_id) ?? "Untitled listing",
    last_message_snippet: messageSnippet(latest.get(row.id) ?? row.message),
    unread_count: row.owner_unread,
    last_message_at: row.last_message_at,
  }));
  return {
    inquiries: rows,
    unread_total: rows.reduce((sum, row) => sum + row.unread_count, 0),
  };
}

/**
 * Inquiry plus messages, oldest first. Marks the thread read for the owner.
 * Null when signed out, the id is not a uuid, or RLS hides the inquiry.
 */
export async function loadThread(inquiryId: string): Promise<OwnerThread | null> {
  if (!uuidPattern.test(inquiryId)) return null;
  const { supabase, user } = await sessionUser();
  if (!user) return null;

  const loaded = await supabase
    .from("inquiries")
    .select(
      "id, listing_id, name, email, phone, move_in, move_out, occupants, pets, status, message, owner_unread",
    )
    .eq("id", inquiryId)
    .maybeSingle();
  if (loaded.error || !loaded.data) return null;

  const [listing, messages] = await Promise.all([
    supabase.from("listings").select("title").eq("id", loaded.data.listing_id).maybeSingle(),
    supabase
      .from("messages")
      .select("id, sender_role, body, emailed, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: true }),
  ]);
  if (messages.error) return null;

  const cleared = await supabase.from("inquiries").update({ owner_unread: 0 }).eq("id", inquiryId);
  if (cleared.error) {
    console.error("inquiry mark read failed", cleared.error.message);
  }

  return {
    inquiry: {
      id: loaded.data.id,
      listing_id: loaded.data.listing_id,
      name: loaded.data.name,
      email: loaded.data.email,
      phone: loaded.data.phone,
      move_in: loaded.data.move_in,
      move_out: loaded.data.move_out,
      occupants: loaded.data.occupants,
      pets: loaded.data.pets,
      status: loaded.data.status,
      message: loaded.data.message,
      listing_title: listing.data?.title?.trim() || "Untitled listing",
      owner_unread: cleared.error ? loaded.data.owner_unread : 0,
    },
    messages: (messages.data ?? []).map((message) => ({
      id: message.id,
      sender_role: message.sender_role,
      body: message.body,
      emailed: message.emailed === true,
      created_at: message.created_at,
    })),
  };
}

/** The signed-in owner's listings, newest update first. Empty when signed out. */
export async function loadOwnerListings(): Promise<OwnerListingCard[]> {
  const { supabase, user } = await sessionUser();
  if (!user) return [];

  const listings = await supabase
    .from("listings")
    .select(listingOwnerColumns.join(","))
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  if (listings.error || !listings.data?.length) return [];

  const rows = listings.data as unknown as {
    id: string;
    title: string | null;
    status: ListingStatus;
    location_id: string;
    setup_step: string | null;
    updated_at: string;
    description: string | null;
    monthly_rent_cents: number | null;
    min_stay_months: number | null;
    bathrooms: number | null;
  }[];
  const ids = rows.map((row) => row.id);

  const [photos, bedrooms] = await Promise.all([
    supabase.from("listing_photos").select("listing_id, storage_path, is_cover").in("listing_id", ids),
    supabase.from("listing_bedrooms").select("listing_id").in("listing_id", ids),
  ]);

  const photoRows = photos.data ?? [];
  const coverPaths = photoRows.filter((photo) => photo.is_cover).map((photo) => photo.storage_path);
  const signed = new Map<string, string>();
  if (coverPaths.length > 0) {
    const urls = await supabase.storage
      .from(LISTING_PHOTOS_BUCKET)
      .createSignedUrls(coverPaths, LISTING_PHOTO_TTL_SECONDS);
    for (const row of urls.data ?? []) {
      if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
    }
  }

  const bedroomCount = new Map<string, number>();
  for (const room of bedrooms.data ?? []) {
    bedroomCount.set(room.listing_id, (bedroomCount.get(room.listing_id) ?? 0) + 1);
  }
  const photoCount = new Map<string, number>();
  const coverPath = new Map<string, string>();
  for (const photo of photoRows) {
    photoCount.set(photo.listing_id, (photoCount.get(photo.listing_id) ?? 0) + 1);
    if (photo.is_cover) coverPath.set(photo.listing_id, photo.storage_path);
  }

  return rows.map((row) => {
    const stored = row.setup_step ?? undefined;
    const step: ListingStepId | null = isListingStep(stored) ? stored : null;
    const progress = listingStepProgress(step);
    const cover = coverPath.get(row.id);
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      cover_url: cover ? (signed.get(cover) ?? null) : null,
      city: locationById(row.location_id)?.name ?? null,
      setup_step: step,
      step_index: progress.step_index,
      step_count: progress.step_count,
      next_step_label: progress.next_step_label,
      status_group: listingStatusGroup(row.status),
      percent_complete: listingPercent({
        title: row.title,
        description: row.description,
        monthly_rent_cents: row.monthly_rent_cents,
        min_stay_months: row.min_stay_months,
        bedroomCount: bedroomCount.get(row.id) ?? 0,
        bathrooms: row.bathrooms,
        photoCount: photoCount.get(row.id) ?? 0,
        hasCover: Boolean(cover),
      }),
      resume_href: resumeHref(row.id, step),
      updated_at: row.updated_at,
    };
  });
}

/** Blocked days in `YYYY-MM` plus every availability window. Null when hidden or the month is invalid. */
export async function loadCalendar(listingId: string, month: string): Promise<CalendarMonth | null> {
  if (!uuidPattern.test(listingId) || !monthPattern.test(month)) return null;
  const { supabase, user } = await sessionUser();
  if (!user) return null;

  const listing = await supabase.from("listings").select("id").eq("id", listingId).maybeSingle();
  if (listing.error || !listing.data) return null;

  const [blocked, availability] = await Promise.all([
    supabase.from("listing_blocked_dates").select("start_date, end_date").eq("listing_id", listingId),
    supabase
      .from("availability_windows")
      .select("id, available_from, available_to")
      .eq("listing_id", listingId)
      .order("available_from"),
  ]);
  if (blocked.error || availability.error) return null;

  return {
    listing_id: listingId,
    month,
    blocked_days: blockedDaysInMonth(blocked.data ?? [], month),
    availability: availability.data ?? [],
  };
}

/** Signed-in profile. Email prefers the auth user address. Null when signed out. */
export async function loadSettings(): Promise<SettingsProfile | null> {
  const { supabase, user } = await sessionUser();
  if (!user) return null;
  const profile = await supabase
    .from("profiles")
    .select("full_name, email, phone, notify_new_inquiry, notify_new_message, notify_listing_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile.error || !profile.data) return null;
  return {
    full_name: profile.data.full_name,
    email: user.email ?? profile.data.email,
    phone: profile.data.phone,
    notify_new_inquiry: profile.data.notify_new_inquiry !== false,
    notify_new_message: profile.data.notify_new_message !== false,
    notify_listing_status: profile.data.notify_listing_status !== false,
  };
}

function fixturesAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

function listingCaption(card: OwnerListingCard): string {
  if (card.status_group === "draft") {
    return stepCaption(card.step_index, card.step_count, card.next_step_label);
  }
  if (card.status === "pending_review") {
    const when = monthDay(card.updated_at);
    return when ? `Submitted ${when} · usually 1 business day` : "Submitted · usually 1 business day";
  }
  return "";
}

function toListing(card: OwnerListingCard): DashboardListing {
  return {
    id: card.id,
    title: card.title?.trim() || "Untitled listing",
    city: card.city ?? "",
    status: boardStatus(card.status),
    statusGroup: card.status_group,
    typeLabel: "",
    bedLabel: null,
    rentLabel: null,
    coverUrl: card.cover_url,
    slug: null,
    stepIndex: card.step_index,
    stepCount: card.step_count,
    nextStepLabel: card.next_step_label,
    percentComplete: card.percent_complete,
    resumeHref: card.resume_href,
    caption: listingCaption(card),
    inquiryCount: 0,
    lastConfirmedAt: null,
  };
}

function toInquiry(row: InboxInquiry, now: Date): DashboardInquiry {
  const at = row.last_message_at;
  return {
    id: row.id,
    listingId: "",
    listingTitle: row.listing_title,
    name: row.name,
    firstName: firstName(row.name),
    email: row.email,
    phone: row.phone,
    status: row.status,
    createdAt: at ?? "",
    listTime: at ? listTime(at, now) : "",
    dateLabel: stayRange(row.move_in, row.move_out),
    occupantLabel: occupantLabel(row.occupants),
    petsLabel: petsLabel(row.pets),
    preview: row.last_message_snippet,
    unread: row.unread_count > 0,
    messages: [],
  };
}

export const loadOwnerDashboard = cache(async (): Promise<OwnerDashboardData> => {
  const { user } = await sessionUser();
  if (!user) {
    if (fixturesAllowed()) return fixtureDashboard();
    return emptyDashboard();
  }

  const [settings, cards, inbox] = await Promise.all([loadSettings(), loadOwnerListings(), loadInbox()]);
  const now = new Date();
  const name = settings?.full_name?.trim() || "";
  const email = settings?.email?.trim() || user.email || "";
  const listings = cards.map(toListing);
  const inquiries = inbox.inquiries.map((row) => toInquiry(row, now));

  return {
    signedIn: true,
    owner: {
      name: name || email,
      email,
      phone: settings?.phone?.trim() || "",
      initials: initials(name, email),
      notifyNewInquiry: settings?.notify_new_inquiry ?? true,
      notifyNewMessage: settings?.notify_new_message ?? true,
      notifyListingStatus: settings?.notify_listing_status ?? true,
    },
    locationId: primaryLocation().id,
    listings,
    inquiries,
    unread: inbox.unread_total,
    counts: filterCounts(listings),
  };
});

function emptyDashboard(): OwnerDashboardData {
  return {
    signedIn: false,
    owner: {
      name: "",
      email: "",
      phone: "",
      initials: "",
      notifyNewInquiry: true,
      notifyNewMessage: true,
      notifyListingStatus: true,
    },
    locationId: primaryLocation().id,
    listings: [],
    inquiries: [],
    unread: 0,
    counts: filterCounts([]),
  };
}
