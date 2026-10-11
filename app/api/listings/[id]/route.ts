import type { ListingUpdate } from "@/lib/db/types";
import { accessDenied, invalidBody, jsonError, readJson } from "@/lib/api/http";
import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import { requireEditableListing, requireOwner } from "@/lib/listings/access";
import { patchListingSchema } from "@/lib/listings/schemas";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await sessionUser();
  const listing = await loadOwnerListing(supabase, id);
  if (!listing) return jsonError(404, "Listing not found");

  const allowed = requireEditableListing(user?.id ?? null, listing);
  if (!allowed.ok) return accessDenied(allowed);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid input");
  }
  const parsed = patchListingSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);

  const { availability, ...fields } = parsed.data;
  const defined = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(defined).length > 0) {
    const updated = await supabase.from("listings").update(defined as ListingUpdate).eq("id", id);
    if (updated.error) return jsonError(400, updated.error.message);
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

  const next = await loadOwnerListing(supabase, id);
  return Response.json({ listing: next });
}

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await sessionUser();
  const listing = await loadOwnerListing(supabase, id);
  if (!listing) return jsonError(404, "Listing not found");
  const allowed = requireOwner(user?.id ?? null, listing.owner_id);
  if (!allowed.ok) return accessDenied(allowed);
  return Response.json({ listing });
}
