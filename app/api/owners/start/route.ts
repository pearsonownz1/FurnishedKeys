import { randomBytes } from "node:crypto";
import { invalidBody, jsonError, readJson } from "@/lib/api/http";
import { normalizeSource } from "@/lib/listings/access";
import { startListingSchema } from "@/lib/listings/schemas";
import { serverNotConfigured } from "@/lib/stripe/config";
import { sessionUser } from "@/lib/api/owner-listing";
import { createServiceClient } from "@/lib/supabase/service";

const SIGN_IN_HINT =
  "An account with this email already exists. Sign in, then start the listing again.";

function emailAlreadyRegistered(error: { message?: string; code?: string }): boolean {
  if (error.code === "email_exists" || error.code === "user_already_exists") return true;
  return /already registered|already exists|already been/i.test(error.message ?? "");
}

/**
 * Anonymous visitors are not sent through signInWithOtp: that cannot return a
 * listing id until the email link is opened. Email confirmation is on, so
 * signUp would create an unconfirmed user with no session and later owner
 * requests would run as anon. This route creates a confirmed user with the
 * admin API, then signInWithPassword on the cookie client so the session
 * cookie is set. The password is random and is not returned. An email that
 * already has an account gets 401 and must sign in. Signed-in callers are reused.
 * The response is always `{ listing_id }`.
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
    const created = await service.auth.admin.createUser({
      email: parsed.data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name },
    });
    if (created.error) {
      if (emailAlreadyRegistered(created.error)) {
        return jsonError(401, "Sign in required", { hint: SIGN_IN_HINT });
      }
      return jsonError(400, created.error.message);
    }
    if (!created.data.user) return jsonError(500, "Could not start the session");

    const signedIn = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password,
    });
    if (signedIn.error || !signedIn.data.session) {
      return jsonError(500, "Could not start the session");
    }
    userId = created.data.user.id;
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
