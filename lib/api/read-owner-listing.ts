import { jsonError } from "@/lib/api/http";
import {
  loadOwnerListing,
  sessionUser,
  type AppClient,
  type OwnerListing,
} from "@/lib/api/owner-listing";

type SessionUser = NonNullable<Awaited<ReturnType<typeof sessionUser>>["user"]>;

export async function openOwnerListing(id: string): Promise<
  | { ok: true; supabase: AppClient; user: SessionUser; listing: OwnerListing }
  | { ok: false; response: Response }
> {
  const { supabase, user } = await sessionUser();
  if (!user) return { ok: false, response: jsonError(401, "Sign in required") };

  const loaded = await readOwnerListing(supabase, id);
  if (!loaded.ok) return loaded;
  if (!loaded.listing) return { ok: false, response: jsonError(404, "Listing not found") };
  return { ok: true, supabase, user, listing: loaded.listing };
}

/** Turns a database error from loadOwnerListing into JSON instead of a thrown 500. */
export async function readOwnerListing(
  supabase: AppClient,
  id: string,
): Promise<{ ok: true; listing: OwnerListing | null } | { ok: false; response: Response }> {
  try {
    return { ok: true, listing: await loadOwnerListing(supabase, id) };
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : "Could not load the listing";
    return { ok: false, response: jsonError(500, message) };
  }
}
