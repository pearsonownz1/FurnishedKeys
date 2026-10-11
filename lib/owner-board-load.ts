import { sessionUser } from "@/lib/api/owner-listing";
import { listingOwnerColumns, type AvailabilityWindow, type Inquiry, type Listing } from "@/lib/db/types";
import { locationById } from "@/lib/locations";
import {
  boardStatus,
  type BoardInquiry,
  type BoardListing,
} from "@/lib/owner-board";

type OwnerRow = Pick<Listing, (typeof listingOwnerColumns)[number]>;

export async function loadOwnerBoard(): Promise<{
  signedIn: boolean;
  listings: BoardListing[];
  inquiries: BoardInquiry[];
} | null> {
  const { supabase, user } = await sessionUser();
  if (!user) return { signedIn: false, listings: [], inquiries: [] };

  const { data, error } = await supabase
    .from("listings")
    .select(listingOwnerColumns.join(","))
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as OwnerRow[];
  const ids = rows.map((row) => row.id);
  const windowsByListing = new Map<string, string | null>();
  const inquiries: BoardInquiry[] = [];

  if (ids.length > 0) {
    const [windows, inquiryRows] = await Promise.all([
      supabase.from("availability_windows").select("*").in("listing_id", ids),
      supabase
        .from("inquiries")
        .select("*")
        .in("listing_id", ids)
        .in("status", ["new", "responded"]),
    ]);
    if (windows.error) throw new Error(windows.error.message);
    if (inquiryRows.error) throw new Error(inquiryRows.error.message);

    for (const window of (windows.data ?? []) as AvailabilityWindow[]) {
      const current = windowsByListing.get(window.listing_id) ?? null;
      const next = window.last_confirmed_at;
      if (!current || (next && next > current)) windowsByListing.set(window.listing_id, next);
    }

    const titles = new Map(rows.map((row) => [row.id, row.title ?? "Listing"]));
    for (const inquiry of (inquiryRows.data ?? []) as Inquiry[]) {
      inquiries.push({
        id: inquiry.id,
        listingTitle: titles.get(inquiry.listing_id) ?? "Listing",
        name: inquiry.name,
        message: inquiry.message,
        createdAt: inquiry.created_at,
        email: inquiry.email,
        phone: inquiry.phone,
        move_in: inquiry.move_in,
        move_out: inquiry.move_out,
        occupants: inquiry.occupants,
        pets: inquiry.pets,
        status: inquiry.status,
        created_at: inquiry.created_at,
      });
    }
  }

  const listings: BoardListing[] = rows.map((row) => ({
    id: row.id,
    title: row.title ?? "Untitled listing",
    area: locationById(row.location_id)?.name ?? "",
    status: boardStatus(row.status),
    paidAt: row.paid_at,
    feePaidThrough: row.fee_paid_through,
    renewalCanceled: row.renewal_canceled,
    adminNote: row.admin_note,
    lastConfirmedAt: windowsByListing.get(row.id) ?? null,
  }));

  return { signedIn: true, listings, inquiries };
}
