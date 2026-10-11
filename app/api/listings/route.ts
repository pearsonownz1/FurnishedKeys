import { accessDenied, invalidBody, jsonError, readJson } from "@/lib/api/http";
import { loadRole, sessionUser } from "@/lib/api/owner-listing";
import { requireUser } from "@/lib/listings/access";
import { createListingSchema } from "@/lib/listings/schemas";
import { serverNotConfigured } from "@/lib/stripe/config";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const { supabase, user } = await sessionUser();
  const signedIn = requireUser(user?.id ?? null);
  if (!signedIn.ok || !user) return accessDenied(signedIn.ok ? { ok: false, status: 401, error: "Sign in required" } : signedIn);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid input");
  }
  const parsed = createListingSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);

  const role = await loadRole(supabase, user.id);
  if (role === "renter" || role == null) {
    const service = createServiceClient();
    if (!service) return serverNotConfigured();
    if (role == null) {
      const inserted = await service.from("profiles").insert({
        id: user.id,
        email: user.email ?? null,
        role: "owner",
      });
      if (inserted.error) return jsonError(500, "Could not create the profile");
    } else {
      const updated = await service.from("profiles").update({ role: "owner" }).eq("id", user.id);
      if (updated.error) return jsonError(500, "Could not update the profile");
    }
  }

  const { location_id, property_type, ...rest } = parsed.data;
  const created = await supabase
    .from("listings")
    .insert({
      owner_id: user.id,
      location_id,
      property_type,
      status: "draft",
      ...rest,
    })
    .select("id")
    .single();
  if (created.error || !created.data) {
    return jsonError(400, created.error?.message ?? "Could not create the listing");
  }

  return Response.json({ listing_id: created.data.id }, { status: 201 });
}
