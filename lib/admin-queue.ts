import { loadRole, sessionUser } from "@/lib/api/owner-listing";
import {
  listingOwnerColumns,
  type Listing,
  type ListingFee,
  type ListingStatus,
} from "@/lib/db/types";
import { locationById } from "@/lib/locations";
import { boardStatus, type BoardStatus } from "@/lib/owner-board";

type OwnerRow = Pick<Listing, (typeof listingOwnerColumns)[number]>;

export type QueueRow = {
  id: string;
  title: string;
  status: BoardStatus;
  feeStatus: Listing["listing_fee_status"];
};

export type ReviewModel = QueueRow & {
  description: string | null;
  area: string;
  adminNote: string | null;
  addressPrivate: string | null;
  monthlyRentCents: number | null;
  fees: { id: string; label: string; amountCents: number }[];
  renewalCanceled: boolean;
  rawStatus: ListingStatus;
};

const queueStatuses: ListingStatus[] = ["pending_review", "changes_requested", "rejected"];

export async function loadReviewQueue(): Promise<{ signedIn: boolean; admin: boolean; rows: QueueRow[] }> {
  const { supabase, user } = await sessionUser();
  if (!user) return { signedIn: false, admin: false, rows: [] };
  const role = await loadRole(supabase, user.id);
  if (role !== "admin") return { signedIn: true, admin: false, rows: [] };

  const { data, error } = await supabase
    .from("listings")
    .select(listingOwnerColumns.join(","))
    .in("status", queueStatuses)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as unknown as OwnerRow[]).map((row) => ({
    id: row.id,
    title: row.title ?? "Untitled listing",
    status: boardStatus(row.status),
    feeStatus: row.listing_fee_status,
  }));
  return { signedIn: true, admin: true, rows };
}

export type ReviewDetailResult =
  | { status: "signed-out" }
  | { status: "forbidden" }
  | { status: "missing" }
  | { status: "ready"; listing: ReviewModel };

export async function loadReviewDetail(id: string): Promise<ReviewDetailResult> {
  const { supabase, user } = await sessionUser();
  if (!user) return { status: "signed-out" };
  const role = await loadRole(supabase, user.id);
  if (role !== "admin") return { status: "forbidden" };

  const { data, error } = await supabase
    .from("listings")
    .select(listingOwnerColumns.join(","))
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as unknown as OwnerRow | null;
  if (!row) return { status: "missing" };

  const [fees, address] = await Promise.all([
    supabase.from("listing_fees").select("*").eq("listing_id", id),
    supabase.rpc("listing_address", { target_listing: id }),
  ]);
  if (fees.error) throw new Error(fees.error.message);

  return {
    status: "ready",
    listing: {
      id: row.id,
      title: row.title ?? "Untitled listing",
      description: row.description,
      area: locationById(row.location_id)?.name ?? "",
      status: boardStatus(row.status),
      feeStatus: row.listing_fee_status,
      adminNote: row.admin_note,
      addressPrivate: address.data ?? null,
      monthlyRentCents: row.monthly_rent_cents,
      fees: ((fees.data ?? []) as ListingFee[]).map((fee) => ({
        id: fee.id,
        label: fee.label,
        amountCents: fee.amount_cents,
      })),
      renewalCanceled: row.renewal_canceled,
      rawStatus: row.status,
    },
  };
}
