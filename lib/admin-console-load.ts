import { cache } from "react";
import { loadRole, sessionUser } from "@/lib/api/owner-listing";
import type { InquiryStatus, ListingStatus, OwnerLead, OwnerLeadInterest, Profile } from "@/lib/db/types";
import { listingOwnerColumns } from "@/lib/db/types";
import { fixtureAdminConsole } from "@/lib/admin-console-fixtures";
import { locationById } from "@/lib/locations";
import { initials } from "@/lib/owner-dashboard";
import { signListingPhotoPaths } from "@/lib/photos";
import {
  composeActivity,
  inquiryReply,
  leadInterestLabel,
  leadSourceLabel,
  leadUiStatus,
  listingBucket,
  listingChecks,
  pacificWeekStart,
  shortName,
  type AdminConsole,
  type AdminInquiry,
  type AdminLead,
  type AdminListingRow,
  type AdminReview,
  type AdminUser,
} from "@/lib/admin-console";

export type AdminGate =
  | { kind: "signed-out" }
  | { kind: "forbidden" }
  | { kind: "ready"; data: AdminConsole };

type ListingRow = {
  id: string;
  owner_id: string;
  location_id: string;
  title: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | string | null;
  monthly_rent_cents: number | null;
  min_stay_months: number;
  house_rules: string | null;
  square_feet: number | null;
  calendar_updated_at: string | null;
  status: ListingStatus;
  updated_at: string;
};

type PhotoRow = {
  listing_id: string;
  storage_path: string;
  is_cover: boolean;
  sort: number;
  caption: string | null;
};

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export const loadAdminConsole = cache(async (): Promise<AdminGate> => {
  const { supabase, user } = await sessionUser();
  if (!user) {
    if (process.env.NODE_ENV !== "production") return { kind: "ready", data: fixtureAdminConsole() };
    return { kind: "signed-out" };
  }
  const role = await loadRole(supabase, user.id);
  if (role !== "admin") return { kind: "forbidden" };

  const [me, listingsRes, leadsRes, inquiriesRes, profilesRes] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("listings").select(listingOwnerColumns.join(",")),
    supabase.from("owner_leads").select("*").order("created_at", { ascending: false }),
    supabase
      .from("inquiries")
      .select("id, listing_id, renter_id, name, email, phone, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email, role, created_at"),
  ]);
  if (me.error) throw new Error(me.error.message);
  if (listingsRes.error) throw new Error(listingsRes.error.message);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (inquiriesRes.error) throw new Error(inquiriesRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const listings = (listingsRes.data ?? []) as unknown as ListingRow[];
  const ids = listings.map((listing) => listing.id);
  const [photosRes, feesRes, windowsRes] = ids.length
    ? await Promise.all([
        supabase
          .from("listing_photos")
          .select("listing_id, storage_path, is_cover, sort, caption")
          .in("listing_id", ids),
        supabase.from("listing_fees").select("listing_id").in("listing_id", ids),
        supabase.from("availability_windows").select("listing_id, last_confirmed_at").in("listing_id", ids),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];
  if (photosRes.error) throw new Error(photosRes.error.message);
  if (feesRes.error) throw new Error(feesRes.error.message);
  if (windowsRes.error) throw new Error(windowsRes.error.message);

  const messagesRes = await supabase
    .from("messages")
    .select("id, inquiry_id, sender_role, created_at")
    .eq("sender_role", "owner")
    .order("created_at", { ascending: false })
    .limit(30);
  const ownerMessages = messagesRes.error ? [] : (messagesRes.data ?? []);

  const photos = (photosRes.data ?? []) as PhotoRow[];
  const signed = await signListingPhotoPaths(photos.map((photo) => photo.storage_path));
  const profiles = (profilesRes.data ?? []) as Pick<Profile, "id" | "full_name" | "email" | "role" | "created_at">[];
  const names = new Map(profiles.map((profile) => [profile.id, profile.full_name?.trim() || profile.email || "Owner"]));

  const feeCount = new Map<string, number>();
  for (const fee of feesRes.data ?? []) {
    feeCount.set(fee.listing_id, (feeCount.get(fee.listing_id) ?? 0) + 1);
  }
  const confirmed = new Set<string>();
  for (const window of windowsRes.data ?? []) {
    if (window.last_confirmed_at) confirmed.add(window.listing_id);
  }
  const photosByListing = new Map<string, PhotoRow[]>();
  for (const photo of photos) {
    const list = photosByListing.get(photo.listing_id) ?? [];
    list.push(photo);
    photosByListing.set(photo.listing_id, list);
  }

  const pending = listings.filter((listing) => listing.status === "pending_review");
  const addresses = new Map<string, string | null>();
  await Promise.all(
    pending.map(async (listing) => {
      const address = await supabase.rpc("listing_address", { target_listing: listing.id });
      if (address.error) throw new Error(address.error.message);
      addresses.set(listing.id, address.data ?? null);
    }),
  );

  const queue: AdminReview[] = pending
    .map((listing) => toReview(listing, photosByListing.get(listing.id) ?? [], signed, names, feeCount, confirmed, addresses))
    .sort((a, b) => (a.submittedAt < b.submittedAt ? -1 : 1));

  const listingRows: AdminListingRow[] = listings
    .map((listing) => ({
      id: listing.id,
      title: listing.title?.trim() || "Untitled listing",
      ownerName: names.get(listing.owner_id) ?? "Owner",
      city: locationById(listing.location_id)?.name ?? "",
      bucket: listingBucket(listing.status),
      updatedAt: listing.updated_at,
    }))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));

  const leads = ((leadsRes.data ?? []) as OwnerLead[]).map(toLead);
  const inquiries = (inquiriesRes.data ?? []).map((row) => toInquiry(row, listings));
  const users = toUsers(profiles, listings, inquiriesRes.data ?? []);

  const listingTitle = new Map(listings.map((listing) => [listing.id, listing.title?.trim() || "Untitled listing"]));
  const inquiryListing = new Map(
    (inquiriesRes.data ?? []).map((row) => [row.id, listingTitle.get(row.listing_id) ?? "a listing"]),
  );
  const now = new Date();
  const weekStart = pacificWeekStart(now).toISOString();
  const activity = composeActivity({
    inquiries: (inquiriesRes.data ?? []).map((row) => ({
      id: row.id,
      title: listingTitle.get(row.listing_id) ?? "a listing",
      at: row.created_at,
    })),
    replies: ownerMessages.flatMap((message) => {
      const title = inquiryListing.get(message.inquiry_id);
      if (!title) return [];
      return [{ id: message.id, title, at: message.created_at }];
    }),
    submissions: pending.map((listing) => ({
      id: listing.id,
      name: shortName(names.get(listing.owner_id) ?? "Owner"),
      at: listing.updated_at,
    })),
    letterLeads: ((leadsRes.data ?? []) as OwnerLead[])
      .filter((lead) => lead.source === "letter")
      .map((lead) => ({ id: lead.id, at: lead.created_at })),
    owners: profiles
      .filter((profile) => profile.role === "owner")
      .map((profile) => ({ id: profile.id, at: profile.created_at })),
    calendars: listings.flatMap((listing) =>
      listing.calendar_updated_at
        ? [{ id: listing.id, title: listing.title?.trim() || "Untitled listing", at: listing.calendar_updated_at }]
        : [],
    ),
  });

  const staffName = me.data?.full_name?.trim() || user.email || "Admin";
  const staffEmail = me.data?.email?.trim() || user.email || "";
  const publicPeople = profiles.filter((profile) => profile.role === "owner" || profile.role === "renter");

  return {
    kind: "ready",
    data: {
      staff: { name: staffName, email: staffEmail, initials: initials(staffName, staffEmail) },
      waiting: pending.length,
      live: listings.filter((listing) => listing.status === "approved").length,
      newLeads: leads.filter((lead) => lead.status === "new").length,
      letterLeads: ((leadsRes.data ?? []) as OwnerLead[]).filter(
        (lead) => lead.status === "new" && lead.source === "letter",
      ).length,
      inquiriesThisWeek: (inquiriesRes.data ?? []).filter((row) => row.created_at >= weekStart).length,
      newSignups: publicPeople.filter((profile) => profile.created_at >= weekStart).length,
      queue,
      activity,
      leads,
      listings: listingRows,
      inquiries,
      users,
    },
  };
});

function toReview(
  listing: ListingRow,
  photos: PhotoRow[],
  signed: Map<string, string>,
  names: Map<string, string>,
  feeCount: Map<string, number>,
  confirmed: Set<string>,
  addresses: Map<string, string | null>,
): AdminReview {
  const ordered = [...photos].sort((a, b) => a.sort - b.sort);
  const cover = ordered.find((photo) => photo.is_cover) ?? ordered[0];
  const title = listing.title?.trim() || "Untitled listing";
  const gallery = ordered.flatMap((photo) => {
    const src = signed.get(photo.storage_path);
    if (!src) return [];
    return [{ src, alt: photo.caption?.trim() || title }];
  });
  const address = addresses.get(listing.id)?.trim() || "";
  return {
    id: listing.id,
    title,
    ownerName: names.get(listing.owner_id) ?? "Owner",
    city: locationById(listing.location_id)?.name ?? "",
    submittedAt: listing.updated_at,
    coverUrl: cover ? (signed.get(cover.storage_path) ?? null) : null,
    description: listing.description,
    monthlyRentCents: listing.monthly_rent_cents,
    bedrooms: listing.bedrooms,
    bathrooms: asNumber(listing.bathrooms),
    squareFeet: listing.square_feet,
    minStayMonths: listing.min_stay_months,
    photos: gallery,
    checks: listingChecks({
      photoCount: ordered.length,
      hasCover: ordered.some((photo) => photo.is_cover),
      monthlyRentCents: listing.monthly_rent_cents,
      feeCount: feeCount.get(listing.id) ?? 0,
      hasAddress: address.length > 0,
      calendarConfirmed: confirmed.has(listing.id) || Boolean(listing.calendar_updated_at),
      houseRules: listing.house_rules,
    }),
  };
}

function toLead(lead: OwnerLead): AdminLead {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    sourceLabel: leadSourceLabel(lead.source),
    interestLabel: leadInterestLabel(lead.interest as OwnerLeadInterest | null),
    status: leadUiStatus(lead.status),
    notes: lead.notes ?? "",
  };
}

function toInquiry(
  row: {
    id: string;
    listing_id: string;
    name: string;
    email: string;
    phone: string | null;
    status: InquiryStatus;
    created_at: string;
  },
  listings: ListingRow[],
): AdminInquiry {
  const listing = listings.find((item) => item.id === row.listing_id);
  return {
    id: row.id,
    name: row.name,
    listingTitle: listing?.title?.trim() || "Untitled listing",
    email: row.email,
    phone: row.phone,
    reply: inquiryReply(row.status),
    receivedAt: row.created_at,
  };
}

function toUsers(
  profiles: Pick<Profile, "id" | "full_name" | "email" | "role" | "created_at">[],
  listings: ListingRow[],
  inquiries: { id: string; listing_id: string; renter_id: string | null }[],
): AdminUser[] {
  const listingCount = new Map<string, number>();
  const ownerOf = new Map(listings.map((listing) => [listing.id, listing.owner_id]));
  for (const listing of listings) {
    listingCount.set(listing.owner_id, (listingCount.get(listing.owner_id) ?? 0) + 1);
  }
  const inquiryIds = new Map<string, Set<string>>();
  const add = (userId: string | null, inquiryId: string) => {
    if (!userId) return;
    const set = inquiryIds.get(userId) ?? new Set<string>();
    set.add(inquiryId);
    inquiryIds.set(userId, set);
  };
  for (const inquiry of inquiries) {
    add(inquiry.renter_id, inquiry.id);
    add(ownerOf.get(inquiry.listing_id) ?? null, inquiry.id);
  }
  return profiles
    .filter((profile): profile is typeof profile & { role: "owner" | "renter" } =>
      profile.role === "owner" || profile.role === "renter",
    )
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name?.trim() || profile.email || "Member",
      email: profile.email ?? "",
      role: profile.role,
      joinedAt: profile.created_at,
      listingCount: listingCount.get(profile.id) ?? 0,
      inquiryCount: inquiryIds.get(profile.id)?.size ?? 0,
    }))
    .sort((a, b) => (a.joinedAt < b.joinedAt ? 1 : -1));
}
