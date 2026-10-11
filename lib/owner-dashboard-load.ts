import { cache } from "react";
import { sessionUser } from "@/lib/api/owner-listing";
import type { AvailabilityWindow, Inquiry, InquiryStatus, Listing, ListingPhoto, ListingStatus, Message } from "@/lib/db/types";
import { listingOwnerColumns } from "@/lib/db/types";
import { isListingStep, type ListingStepId } from "@/lib/listing-draft";
import { locationById, primaryLocation } from "@/lib/locations";
import { formatCents } from "@/lib/money";
import { fixtureDashboard } from "@/lib/owner-dashboard-fixtures";
import {
  blockedDaysInMonth,
  confirmedAgo,
  filterCounts,
  firstName,
  initials,
  inquiryPreview,
  listingPercent,
  listingStatusCaption,
  listingStatusGroup,
  listingStepProgress,
  listTime,
  messageSnippet,
  monthDay,
  occupantLabel,
  petsLabel,
  resumeHref,
  setupProgress,
  stayRange,
  threadMessages,
  type DashboardInquiry,
  type DashboardListing,
  type OwnerDashboardData,
  type OwnerListingCard,
  type SetupSignals,
} from "@/lib/owner-dashboard";
import { boardStatus } from "@/lib/owner-board";
import { bedFact, propertyTypeName } from "@/lib/property-display";
import { LISTING_PHOTOS_BUCKET, LISTING_PHOTO_TTL_SECONDS, signListingPhotoPaths } from "@/lib/photos";

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

type OwnerRow = Pick<Listing, (typeof listingOwnerColumns)[number]>;

function fixturesAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function coverPath(photos: Pick<ListingPhoto, "storage_path" | "sort" | "is_cover">[]): string | null {
  if (photos.length === 0) return null;
  const marked = photos.find((photo) => photo.is_cover);
  if (marked) return marked.storage_path;
  return [...photos].sort((left, right) => left.sort - right.sort)[0]?.storage_path ?? null;
}

export const loadOwnerDashboard = cache(async (): Promise<OwnerDashboardData> => {
  const { supabase, user } = await sessionUser();
  if (!user) {
    if (fixturesAllowed()) return fixtureDashboard();
    return emptyDashboard();
  }

  const profile = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .maybeSingle();
  if (profile.error) throw new Error(profile.error.message);

  const name = profile.data?.full_name?.trim() || "";
  const email = profile.data?.email?.trim() || user.email || "";
  const phone = profile.data?.phone?.trim() || "";

  const { data, error } = await supabase
    .from("listings")
    .select(listingOwnerColumns.join(","))
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as OwnerRow[];
  const ids = rows.map((row) => row.id);
  const now = new Date();
  const photosByListing = new Map<string, ListingPhoto[]>();
  const bedroomsByListing = new Map<string, number>();
  const availableFrom = new Map<string, string | null>();
  const confirmedAt = new Map<string, string | null>();
  const inquiries: DashboardInquiry[] = [];

  if (ids.length > 0) {
    const [photos, bedrooms, windows, inquiryRows] = await Promise.all([
      supabase.from("listing_photos").select("*").in("listing_id", ids),
      supabase.from("listing_bedrooms").select("id, listing_id").in("listing_id", ids),
      supabase.from("availability_windows").select("*").in("listing_id", ids),
      supabase.from("inquiries").select("*").in("listing_id", ids).in("status", ["new", "responded"]),
    ]);
    if (photos.error) throw new Error(photos.error.message);
    if (bedrooms.error) throw new Error(bedrooms.error.message);
    if (windows.error) throw new Error(windows.error.message);
    if (inquiryRows.error) throw new Error(inquiryRows.error.message);

    for (const photo of (photos.data ?? []) as ListingPhoto[]) {
      const list = photosByListing.get(photo.listing_id) ?? [];
      list.push(photo);
      photosByListing.set(photo.listing_id, list);
    }
    for (const room of bedrooms.data ?? []) {
      bedroomsByListing.set(room.listing_id, (bedroomsByListing.get(room.listing_id) ?? 0) + 1);
    }
    for (const window of (windows.data ?? []) as AvailabilityWindow[]) {
      const current = availableFrom.get(window.listing_id);
      if (!current || window.available_from < current) {
        availableFrom.set(window.listing_id, window.available_from);
      }
      const confirmed = confirmedAt.get(window.listing_id) ?? null;
      const next = window.last_confirmed_at;
      if (!confirmed || (next && next > confirmed)) confirmedAt.set(window.listing_id, next);
    }

    const inquiryList = (inquiryRows.data ?? []) as Inquiry[];
    const inquiryIds = inquiryList.map((inquiry) => inquiry.id);
    const repliesByInquiry = new Map<string, Message[]>();
    if (inquiryIds.length > 0) {
      const messages = await supabase
        .from("messages")
        .select("*")
        .in("inquiry_id", inquiryIds)
        .order("created_at", { ascending: true });
      if (messages.error) throw new Error(messages.error.message);
      for (const message of (messages.data ?? []) as Message[]) {
        const list = repliesByInquiry.get(message.inquiry_id) ?? [];
        list.push(message);
        repliesByInquiry.set(message.inquiry_id, list);
      }
    }

    const titles = new Map(rows.map((row) => [row.id, row.title?.trim() || "Listing"]));
    for (const inquiry of inquiryList) {
      const replies = [...(repliesByInquiry.get(inquiry.id) ?? [])].sort((left, right) =>
        left.created_at.localeCompare(right.created_at),
      );
      const messages = threadMessages({
        inquiryId: inquiry.id,
        body: inquiry.message,
        createdAt: inquiry.created_at,
        renterName: inquiry.name,
        ownerId: user.id,
        now,
        replies: replies.map((message) => ({
          id: message.id,
          body: message.body,
          createdAt: message.created_at,
          senderId: message.sender_id,
        })),
      });
      const latestAt = replies.at(-1)?.created_at ?? inquiry.created_at;
      inquiries.push({
        id: inquiry.id,
        listingId: inquiry.listing_id,
        listingTitle: titles.get(inquiry.listing_id) ?? "Listing",
        name: inquiry.name,
        firstName: firstName(inquiry.name),
        email: inquiry.email,
        phone: inquiry.phone,
        status: inquiry.status,
        createdAt: latestAt,
        listTime: listTime(latestAt, now),
        dateLabel: stayRange(inquiry.move_in, inquiry.move_out),
        occupantLabel: occupantLabel(inquiry.occupants),
        petsLabel: petsLabel(inquiry.pets),
        preview: inquiryPreview(messages),
        unread: inquiry.status === "new",
        messages,
      });
    }
    inquiries.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  const signed = await signListingPhotoPaths(
    [...photosByListing.values()].map((photos) => coverPath(photos)).filter((path): path is string => Boolean(path)),
  );
  const inquiryCount = new Map<string, number>();
  for (const inquiry of inquiries) {
    inquiryCount.set(inquiry.listingId, (inquiryCount.get(inquiry.listingId) ?? 0) + 1);
  }

  const listings: DashboardListing[] = rows.map((row) => {
    const photos = photosByListing.get(row.id) ?? [];
    const bedroomCount = bedroomsByListing.get(row.id) ?? 0;
    const beds = bedroomCount > 0 ? bedroomCount : row.bedrooms;
    const status = boardStatus(row.status);
    const signals: SetupSignals = {
      title: row.title,
      bedroomCount: beds ?? 0,
      bathrooms: asNumber(row.bathrooms),
      photoCount: photos.length,
      description: row.description,
      goodFor: row.good_for ?? [],
      amenities: row.amenities ?? [],
      monthlyRentCents: row.monthly_rent_cents,
      availableFrom: availableFrom.get(row.id) ?? null,
      houseRules: row.house_rules,
      petPolicy: row.pet_policy,
      petsAllowed: row.pets_allowed,
      smokingAllowed: row.smoking_allowed,
    };
    const progress = setupProgress(signals);
    const lastConfirmedAt = confirmedAt.get(row.id) ?? null;
    const count = inquiryCount.get(row.id) ?? 0;
    const rent = row.monthly_rent_cents != null && row.monthly_rent_cents > 0 ? `${formatCents(row.monthly_rent_cents)}/mo` : null;
    const path = coverPath(photos);
    return {
      id: row.id,
      title: row.title?.trim() || "Untitled listing",
      city: locationById(row.location_id)?.name ?? "",
      status,
      typeLabel: propertyTypeName(row.property_type),
      bedLabel: bedFact(beds),
      rentLabel: rent,
      coverUrl: path ? (signed.get(path) ?? null) : null,
      slug: row.slug,
      progress,
      inquiryCount: count,
      lastConfirmedAt,
      caption: listingStatusCaption({
        status,
        progress,
        submittedOn: monthDay(row.updated_at),
        confirmedAgo: confirmedAgo(lastConfirmedAt, now),
        inquiryCount: count,
        adminNote: row.admin_note,
      }),
    };
  });

  return {
    signedIn: true,
    owner: { name: name || email, email, phone, initials: initials(name, email) },
    locationId: primaryLocation().id,
    listings,
    inquiries,
    unread: inquiries.filter((inquiry) => inquiry.unread).length,
    counts: filterCounts(listings),
  };
});

function emptyDashboard(): OwnerDashboardData {
  return {
    signedIn: false,
    owner: { name: "", email: "", phone: "", initials: "" },
    locationId: primaryLocation().id,
    listings: [],
    inquiries: [],
    unread: 0,
    counts: filterCounts([]),
  };
}
