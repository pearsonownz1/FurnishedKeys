import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Listing, UserRole } from "@/lib/db/types";
import { listingOwnerColumns } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export type AppClient = SupabaseClient<Database>;

export type OwnerListing = Pick<Listing, (typeof listingOwnerColumns)[number]>;

const ownerSelect = listingOwnerColumns.join(",");

export async function sessionUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null };
  return { supabase, user: data.user };
}

export async function loadOwnerListing(
  supabase: AppClient,
  id: string,
): Promise<OwnerListing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(ownerSelect)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as OwnerListing | null;
}

export async function loadRole(supabase: AppClient, userId: string): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.role ?? null;
}

export async function loadSetupState(supabase: AppClient, listingId: string) {
  const [photos, bedrooms] = await Promise.all([
    supabase
      .from("listing_photos")
      .select("id, is_cover, sort")
      .eq("listing_id", listingId),
    supabase
      .from("listing_bedrooms")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId),
  ]);
  if (photos.error) throw new Error(photos.error.message);
  if (bedrooms.error) throw new Error(bedrooms.error.message);
  const rows = photos.data ?? [];
  return {
    photos: rows,
    photoCount: rows.length,
    hasCover: rows.some((photo) => photo.is_cover),
    bedroomCount: bedrooms.count ?? 0,
  };
}
