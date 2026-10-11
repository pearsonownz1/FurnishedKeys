import { randomBytes } from "node:crypto";
import { invalidBody, jsonError, readJson } from "@/lib/api/http";
import { normalizeSource } from "@/lib/listings/access";
import { startListingSchema } from "@/lib/listings/schemas";
import { serverNotConfigured } from "@/lib/stripe/config";
import { sessionUser } from "@/lib/api/owner-listing";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Anonymous visitors are not sent through signInWithOtp: that cannot return a
 * listing id until the email link is opened, and the sign-in page is not built.
 * This route creates a confirmed user with the admin API when there is no
 * session, then calls signUp on the cookie client so a session is stored when
 * Supabase returns one (email confirmation off). The password is random and is
 * not returned. An email that already has an account gets 401 and must sign in.
 * Signed-in callers are reused. The response is always `{ listing_id }`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid input");
  }
  const parsed = startListingSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);

  const source = normalizeSource(parsed.data.source);
  if (!source) return jsonError(400, "Invalid source");

  const service = createServiceClient();
  if (!service) return serverNotConfigured();

  const { supabase, user: session } = await sessionUser();
  let userId = session?.id ?? null;

  if (session && session.email && session.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return jsonError(400, "Email does not match the signed-in account");
  }

  if (!userId) {
    const password = randomBytes(24).toString("base64url");
    const signedUp = await supabase.auth.signUp({
      email: parsed.data.email,
      password,
      options: { data: { full_name: parsed.data.full_name } },
    });
    if (signedUp.error) {
      const duplicate = /already registered|already exists|already been/i.test(
        signedUp.error.message,
      );
      if (duplicate) {
        return jsonError(401, "Sign in required", {
          hint: "An account with this email already exists. Sign in, then start the listing again.",
        });
      }
      return jsonError(400, signedUp.error.message);
    }
    const created = signedUp.data.user;
    if (!created || (created.identities?.length ?? 0) === 0) {
      return jsonError(401, "Sign in required", {
        hint: "An account with this email already exists. Sign in, then start the listing again.",
      });
    }
    userId = created.id;
  }

  const { data: location, error: locationError } = await service
    .from("locations")
    .select("id")
    .eq("id", parsed.data.location_id)
    .eq("active", true)
    .maybeSingle();
  if (locationError) return jsonError(500, "Could not check the location");
  if (!location) return jsonError(400, "Choose an active location");

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return jsonError(500, "Could not load the profile");

  if (!profile) {
    const inserted = await service.from("profiles").insert({
      id: userId,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      role: "owner",
    });
    if (inserted.error) return jsonError(500, "Could not create the profile");
  } else {
    const updated = await service
      .from("profiles")
      .update({
        email: parsed.data.email,
        full_name: parsed.data.full_name,
        phone: parsed.data.phone,
        ...(profile.role === "renter" ? { role: "owner" as const } : {}),
      })
      .eq("id", userId);
    if (updated.error) return jsonError(500, "Could not update the profile");
  }

  const createdListing = await service
    .from("listings")
    .insert({
      owner_id: userId,
      location_id: parsed.data.location_id,
      property_type: parsed.data.property_type,
      source,
      status: "draft",
    })
    .select("id")
    .single();
  if (createdListing.error || !createdListing.data) {
    return jsonError(500, "Could not create the listing");
  }

  return Response.json({ listing_id: createdListing.data.id });
}
