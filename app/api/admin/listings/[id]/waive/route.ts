import { accessDenied, jsonError } from "@/lib/api/http";
import { loadRole, sessionUser } from "@/lib/api/owner-listing";
import { readOwnerListing } from "@/lib/api/read-owner-listing";
import { requireAdmin } from "@/lib/listings/access";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await sessionUser();
  if (!user) return jsonError(401, "Sign in required");
  const role = await loadRole(supabase, user.id);
  const allowed = requireAdmin(user.id, role);
  if (!allowed.ok) return accessDenied(allowed);

  const loaded = await readOwnerListing(supabase, id);
  if (!loaded.ok) return loaded.response;
  if (!loaded.listing) return jsonError(404, "Listing not found");

  const updated = await supabase
    .from("listings")
    .update({ listing_fee_status: "waived" })
    .eq("id", id);
  if (updated.error) return jsonError(400, updated.error.message);

  const next = await readOwnerListing(supabase, id);
  if (!next.ok) return next.response;
  return Response.json({ listing: next.listing });
}
