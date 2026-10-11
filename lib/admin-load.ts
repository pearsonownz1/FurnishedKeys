import { forbidden } from "next/navigation";
import { loadRole, sessionUser } from "@/lib/api/owner-listing";
import { leadSourceLabel, reviewChecklist, type ReviewCheck } from "@/lib/admin-review";
import {
  listingStatuses,
  ownerLeadStatuses,
  type ListingStatus,
  type OwnerLeadStatus,
} from "@/lib/db/types";
import { LISTING_PHOTOS_BUCKET, LISTING_PHOTO_TTL_SECONDS } from "@/lib/photos";
import { createServiceClient } from "@/lib/supabase/service";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminCounts = {
  review_waiting: number;
  leads_new: number;
  listings_live: number;
  listings_total: number;
  inquiries_7d: number;
  owners_total: number;
};

export type ReviewQueueRow = {
  id: string;
  title: string | null;
  owner_name: string | null;
  owner_email: string | null;
  city: string | null;
  submitted_at: string | null;
  cover_url: string | null;
  /** Monthly rent in cents. */
  rent: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  checklist: ReviewCheck[];
};

export type ActivityKind =
  | "listing_submitted"
  | "listing_approved"
  | "inquiry"
  | "owner_lead"
  | "signup";

export type ActivityItem = {
  kind: ActivityKind;
  label: string;
  at: string;
  href: string;
};

export type AdminListingRow = {
  id: string;
  title: string | null;
  status: ListingStatus;
  owner_name: string | null;
  owner_email: string | null;
  city: string | null;
  /** Monthly rent in cents. */
  rent: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  submitted_at: string | null;
  updated_at: string;
};

export type AdminLeadRow = {
  id: string;
  source: string;
  source_label: string;
  status: OwnerLeadStatus;
  notes: string | null;
  interest: string | null;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
};

export type AdminInquiryRow = {
  id: string;
  listing_id: string;
  listing_title: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  move_in: string;
  move_out: string | null;
  message: string;
  created_at: string;
};

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  listings_count: number;
  created_at: string;
  last_sign_in_at: string | null;
};

type Service = NonNullable<ReturnType<typeof createServiceClient>>;

async function adminService(): Promise<Service> {
  const { supabase, user } = await sessionUser();
  if (!user) forbidden();
  const role = await loadRole(supabase, user.id);
  if (role !== "admin") forbidden();
  const service = createServiceClient();
  if (!service) throw new Error("service client is not configured");
  return service;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

async function exactCount(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return result.count ?? 0;
}

export async function loadAdminCounts(): Promise<AdminCounts> {
  const service = await adminService();
  const since = new Date(Date.now() - WEEK_MS).toISOString();
  const [review_waiting, leads_new, listings_live, listings_total, inquiries_7d, owners_total] =
    await Promise.all([
      exactCount(
        service.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
      ),
      exactCount(
        service.from("owner_leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      ),
      exactCount(
        service.from("listings").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ),
      exactCount(service.from("listings").select("id", { count: "exact", head: true })),
      exactCount(
        service.from("inquiries").select("id", { count: "exact", head: true }).gte("created_at", since),
      ),
      exactCount(
        service.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"),
      ),
    ]);
  return { review_waiting, leads_new, listings_live, listings_total, inquiries_7d, owners_total };
}

type ListingCore = {
  id: string;
  title: string | null;
  owner_id: string;
  location_id: string;
  status: ListingStatus;
  submitted_at: string | null;
  updated_at: string;
  description: string | null;
  monthly_rent_cents: number | null;
  bedrooms: number | null;
  bathrooms: number | string | null;
  square_feet: number | null;
  amenities: string[] | null;
  house_rules: string | null;
  address_private: string | null;
  approx_lat: number | string | null;
  approx_lng: number | string | null;
};

const listingColumns =
  "id, title, owner_id, location_id, status, submitted_at, updated_at, description, monthly_rent_cents, bedrooms, bathrooms, square_feet, amenities, house_rules, address_private, approx_lat, approx_lng";

export async function loadReviewQueue(): Promise<ReviewQueueRow[]> {
  const service = await adminService();
  const listed = await service
    .from("listings")
    .select(listingColumns)
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: true, nullsFirst: false });
  if (listed.error) throw new Error(listed.error.message);
  const rows = (listed.data ?? []) as unknown as ListingCore[];
  const packed = await packListings(service, rows);
  return packed.map((row) => ({
    id: row.id,
    title: row.title,
    owner_name: row.owner_name,
    owner_email: row.owner_email,
    city: row.city,
    submitted_at: row.submitted_at,
    cover_url: row.cover_url,
    rent: row.rent,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    checklist: row.checklist,
  }));
}

export async function loadRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const service = await adminService();
  const take = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  const [submitted, approved, inquiries, leads, signups] = await Promise.all([
    service
      .from("listings")
      .select("id, title, submitted_at")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(take),
    service
      .from("listings")
      .select("id, title, reviewed_at")
      .eq("status", "approved")
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(take),
    service
      .from("inquiries")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(take),
    service
      .from("owner_leads")
      .select("id, name, created_at")
      .order("created_at", { ascending: false })
      .limit(take),
    service
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false })
      .limit(take),
  ]);
  for (const result of [submitted, approved, inquiries, leads, signups]) {
    if (result.error) throw new Error(result.error.message);
  }

  const items: ActivityItem[] = [];
  for (const row of submitted.data ?? []) {
    if (!row.submitted_at) continue;
    const title = row.title?.trim() || "A listing";
    items.push({
      kind: "listing_submitted",
      label: `${title} submitted`,
      at: row.submitted_at,
      href: `/admin/listings/${row.id}`,
    });
  }
  for (const row of approved.data ?? []) {
    if (!row.reviewed_at) continue;
    const title = row.title?.trim() || "A listing";
    items.push({
      kind: "listing_approved",
      label: `${title} approved`,
      at: row.reviewed_at,
      href: `/admin/listings/${row.id}`,
    });
  }
  for (const row of inquiries.data ?? []) {
    items.push({
      kind: "inquiry",
      label: `Inquiry from ${row.name}`,
      at: row.created_at,
      href: `/admin/inquiries/${row.id}`,
    });
  }
  for (const row of leads.data ?? []) {
    items.push({
      kind: "owner_lead",
      label: `Owner lead from ${row.name}`,
      at: row.created_at,
      href: `/admin/leads/${row.id}`,
    });
  }
  for (const row of signups.data ?? []) {
    const who = row.full_name?.trim() || row.email?.trim() || "A new account";
    items.push({
      kind: "signup",
      label: `${who} signed up`,
      at: row.created_at,
      href: "/admin/users",
    });
  }
  return items.sort((left, right) => right.at.localeCompare(left.at)).slice(0, take);
}

export async function loadAdminListings(filter?: {
  status?: ListingStatus;
}): Promise<AdminListingRow[]> {
  const service = await adminService();
  const status = filter?.status;
  if (status && !listingStatuses.includes(status)) return [];
  let query = service.from("listings").select(listingColumns).order("updated_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const listed = await query;
  if (listed.error) throw new Error(listed.error.message);
  const packed = await packListings(service, (listed.data ?? []) as unknown as ListingCore[]);
  return packed.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    owner_name: row.owner_name,
    owner_email: row.owner_email,
    city: row.city,
    rent: row.rent,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    submitted_at: row.submitted_at,
    updated_at: row.updated_at,
  }));
}

export async function loadOwnerLeads(filter?: { status?: OwnerLeadStatus }): Promise<AdminLeadRow[]> {
  const service = await adminService();
  const status = filter?.status;
  if (status && !ownerLeadStatuses.includes(status)) return [];
  let query = service
    .from("owner_leads")
    .select("id, name, email, phone, property_address, notes, interest, source, status, created_at")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const leads = await query;
  if (leads.error) throw new Error(leads.error.message);
  return (leads.data ?? []).map((row) => ({
    id: row.id,
    source: row.source,
    source_label: leadSourceLabel(row.source),
    status: row.status,
    notes: row.notes,
    interest: row.interest,
    name: row.name,
    email: row.email,
    phone: row.phone,
    address: row.property_address,
    created_at: row.created_at,
  }));
}

export async function loadAdminInquiries(): Promise<AdminInquiryRow[]> {
  const service = await adminService();
  const inquiries = await service
    .from("inquiries")
    .select("id, listing_id, name, email, phone, status, move_in, move_out, message, created_at")
    .order("created_at", { ascending: false });
  if (inquiries.error) throw new Error(inquiries.error.message);
  const rows = inquiries.data ?? [];
  const listingIds = [...new Set(rows.map((row) => row.listing_id))];
  const titles = new Map<string, string | null>();
  if (listingIds.length > 0) {
    const listings = await service.from("listings").select("id, title").in("id", listingIds);
    if (listings.error) throw new Error(listings.error.message);
    for (const listing of listings.data ?? []) titles.set(listing.id, listing.title);
  }
  return rows.map((row) => ({
    id: row.id,
    listing_id: row.listing_id,
    listing_title: titles.get(row.listing_id) ?? null,
    name: row.name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    move_in: row.move_in,
    move_out: row.move_out,
    message: row.message,
    created_at: row.created_at,
  }));
}

export async function loadAdminUsers(): Promise<AdminUserRow[]> {
  const service = await adminService();
  const profiles = await service
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false });
  if (profiles.error) throw new Error(profiles.error.message);
  const people = profiles.data ?? [];
  const [signs, listings] = await Promise.all([lastSignIns(service), listingCounts(service)]);
  return people.map((person) => ({
    id: person.id,
    full_name: person.full_name,
    email: person.email,
    role: person.role,
    listings_count: listings.get(person.id) ?? 0,
    created_at: person.created_at,
    last_sign_in_at: signs.get(person.id) ?? null,
  }));
}

async function lastSignIns(service: Service): Promise<Map<string, string | null>> {
  const signs = new Map<string, string | null>();
  for (let page = 1; page <= 20; page += 1) {
    const listed = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) {
      console.error("admin users sign-in lookup failed", listed.error.message);
      return signs;
    }
    for (const user of listed.data.users) {
      signs.set(user.id, user.last_sign_in_at ?? null);
    }
    if (listed.data.users.length < 200) break;
  }
  return signs;
}

async function listingCounts(service: Service): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const listings = await service.from("listings").select("owner_id");
  if (listings.error) throw new Error(listings.error.message);
  for (const row of listings.data ?? []) {
    counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1);
  }
  return counts;
}

type PackedListing = AdminListingRow & {
  checklist: ReviewCheck[];
  cover_url: string | null;
};

async function packListings(service: Service, rows: ListingCore[]): Promise<PackedListing[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const ownerIds = [...new Set(rows.map((row) => row.owner_id))];
  const locationIds = [...new Set(rows.map((row) => row.location_id))];
  const [photos, fees, windows, rooms, owners, cities] = await Promise.all([
    service.from("listing_photos").select("listing_id, storage_path, is_cover, sort").in("listing_id", ids),
    service.from("listing_fees").select("listing_id").in("listing_id", ids),
    service.from("availability_windows").select("listing_id").in("listing_id", ids),
    service.from("listing_bedrooms").select("listing_id").in("listing_id", ids),
    service.from("profiles").select("id, full_name, email").in("id", ownerIds),
    service.from("locations").select("id, name").in("id", locationIds),
  ]);
  for (const result of [photos, fees, windows, rooms, owners, cities]) {
    if (result.error) throw new Error(result.error.message);
  }

  const photoRows = photos.data ?? [];
  const coverByListing = new Map<string, string>();
  const photoCount = new Map<string, number>();
  const hasCover = new Map<string, boolean>();
  const grouped = new Map<string, { storage_path: string; is_cover: boolean; sort: number }[]>();
  for (const photo of photoRows) {
    photoCount.set(photo.listing_id, (photoCount.get(photo.listing_id) ?? 0) + 1);
    if (photo.is_cover) hasCover.set(photo.listing_id, true);
    const list = grouped.get(photo.listing_id) ?? [];
    list.push(photo);
    grouped.set(photo.listing_id, list);
  }
  for (const [listingId, list] of grouped) {
    const cover = [...list].sort((left, right) => {
      if (left.is_cover !== right.is_cover) return left.is_cover ? -1 : 1;
      return left.sort - right.sort;
    })[0];
    if (cover) coverByListing.set(listingId, cover.storage_path);
  }
  const signed = await signCovers(service, [...coverByListing.values()]);

  const feeCount = new Map<string, number>();
  for (const fee of fees.data ?? []) {
    feeCount.set(fee.listing_id, (feeCount.get(fee.listing_id) ?? 0) + 1);
  }
  const available = new Set((windows.data ?? []).map((window) => window.listing_id));
  const roomCount = new Map<string, number>();
  for (const room of rooms.data ?? []) {
    roomCount.set(room.listing_id, (roomCount.get(room.listing_id) ?? 0) + 1);
  }
  const ownerById = new Map((owners.data ?? []).map((owner) => [owner.id, owner]));
  const cityById = new Map((cities.data ?? []).map((city) => [city.id, city.name]));

  return rows.map((row) => {
    const roomsForListing = roomCount.get(row.id) ?? 0;
    const owner = ownerById.get(row.owner_id);
    const cover = coverByListing.get(row.id);
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      owner_name: owner?.full_name ?? null,
      owner_email: owner?.email ?? null,
      city: cityById.get(row.location_id) ?? null,
      rent: asNumber(row.monthly_rent_cents),
      beds: roomsForListing > 0 ? roomsForListing : row.bedrooms,
      baths: asNumber(row.bathrooms),
      sqft: asNumber(row.square_feet),
      submitted_at: row.submitted_at,
      updated_at: row.updated_at,
      cover_url: cover ? (signed.get(cover) ?? null) : null,
      checklist: reviewChecklist({
        photoCount: photoCount.get(row.id) ?? 0,
        hasCover: hasCover.get(row.id) === true,
        description: row.description,
        monthlyRentCents: asNumber(row.monthly_rent_cents),
        feeCount: feeCount.get(row.id) ?? 0,
        hasAvailability: available.has(row.id),
        amenityCount: row.amenities?.length ?? 0,
        houseRules: row.house_rules,
        address: row.address_private,
        lat: asNumber(row.approx_lat),
        lng: asNumber(row.approx_lng),
      }),
    };
  });
}

async function signCovers(service: Service, paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const unique = [...new Set(paths.map((path) => path.trim()).filter(Boolean))];
  const remote: string[] = [];
  for (const path of unique) {
    if (path.startsWith("demo/")) urls.set(path, `/${path}`);
    else remote.push(path);
  }
  if (remote.length === 0) return urls;
  const signed = await service.storage
    .from(LISTING_PHOTOS_BUCKET)
    .createSignedUrls(remote, LISTING_PHOTO_TTL_SECONDS);
  if (signed.error || !signed.data) return urls;
  for (const item of signed.data) {
    if (item.path && item.signedUrl && !item.error) urls.set(item.path, item.signedUrl);
  }
  return urls;
}
