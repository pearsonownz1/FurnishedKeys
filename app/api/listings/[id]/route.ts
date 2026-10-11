import type { ListingUpdate } from "@/lib/db/types";
import { accessDenied, invalidBody, jsonError, readJson } from "@/lib/api/http";
import { openOwnerListing, readOwnerListing } from "@/lib/api/read-owner-listing";
import { requireEditableListing, requireOwner } from "@/lib/listings/access";
import { patchListingSchema } from "@/lib/listings/schemas";
import { bedroomInserts } from "@/lib/listings/setup";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const opened = await openOwnerListing(id);
  if (!opened.ok) return opened.response;
  const { supabase, user, listing } = opened;

  const allowed = requireEditableListing(user.id, listing);
  if (!allowed.ok) return accessDenied(allowed);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid input");
  }
  const parsed = patchListingSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);

  const { availability, bedrooms, ...fields } = parsed.data;
  const defined = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(defined).length > 0) {
    const updated = await supabase.from("listings").update(defined as ListingUpdate).eq("id", id);
    if (updated.error) return jsonError(400, updated.error.message);
  }

  if (bedrooms) {
    const removed = await supabase.from("listing_bedrooms").delete().eq("listing_id", id);
    if (removed.error) return jsonError(400, removed.error.message);
    if (bedrooms.length > 0) {
      const inserted = await supabase
        .from("listing_bedrooms")
        .insert(bedroomInserts(id, bedrooms));
      if (inserted.error) return jsonError(400, inserted.error.message);
    }
  }

  if (availability) {
    const removed = await supabase.from("availability_windows").delete().eq("listing_id", id);
    if (removed.error) return jsonError(400, removed.error.message);
    if (availability.length > 0) {
      const inserted = await supabase.from("availability_windows").insert(
        availability.map((window) => ({
          listing_id: id,
          available_from: window.available_from,
          available_to: window.available_to ?? null,
        })),
      );
      if (inserted.error) return jsonError(400, inserted.error.message);
    }
  }

  const next = await readOwnerListing(supabase, id);
  if (!next.ok) return next.response;
  return Response.json({ listing: next.listing });
}

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const opened = await openOwnerListing(id);
  if (!opened.ok) return opened.response;
  const { user, listing } = opened;
  const allowed = requireOwner(user.id, listing.owner_id);
  if (!allowed.ok) return accessDenied(allowed);
  return Response.json({ listing });
}
