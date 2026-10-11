import { accessDenied, invalidBody, jsonError, readJson } from "@/lib/api/http";
import type { AppClient } from "@/lib/api/owner-listing";
import { openOwnerListing } from "@/lib/api/read-owner-listing";
import { requireEditableListing, requireOwner } from "@/lib/listings/access";
import { calendarSchema } from "@/lib/listings/schemas";

type Context = { params: Promise<{ id: string }> };

async function loadCalendar(supabase: AppClient, id: string) {
  const [listing, availability, blocked] = await Promise.all([
    supabase.from("listings").select("calendar_updated_at").eq("id", id).maybeSingle(),
    supabase
      .from("availability_windows")
      .select("id, available_from, available_to, last_confirmed_at, confirmed_by")
      .eq("listing_id", id)
      .order("available_from"),
    supabase
      .from("listing_blocked_dates")
      .select("id, start_date, end_date, note")
      .eq("listing_id", id)
      .order("start_date"),
  ]);
  if (listing.error) throw new Error(listing.error.message);
  if (availability.error) throw new Error(availability.error.message);
  if (blocked.error) throw new Error(blocked.error.message);
  return {
    calendar_updated_at: listing.data?.calendar_updated_at ?? null,
    availability: availability.data ?? [],
    blocked_dates: blocked.data ?? [],
  };
}

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const opened = await openOwnerListing(id);
  if (!opened.ok) return opened.response;
  const { supabase, user, listing } = opened;
  const allowed = requireOwner(user.id, listing.owner_id);
  if (!allowed.ok) return accessDenied(allowed);

  try {
    return Response.json(await loadCalendar(supabase, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the calendar";
    return jsonError(400, message);
  }
}

export async function PUT(request: Request, context: Context) {
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
  const parsed = calendarSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);

  const removedWindows = await supabase.from("availability_windows").delete().eq("listing_id", id);
  if (removedWindows.error) return jsonError(400, removedWindows.error.message);
  if (parsed.data.availability.length > 0) {
    const inserted = await supabase.from("availability_windows").insert(
      parsed.data.availability.map((window) => ({
        listing_id: id,
        available_from: window.available_from,
        available_to: window.available_to ?? null,
      })),
    );
    if (inserted.error) return jsonError(400, inserted.error.message);
  }

  const removedBlocks = await supabase.from("listing_blocked_dates").delete().eq("listing_id", id);
  if (removedBlocks.error) return jsonError(400, removedBlocks.error.message);
  if (parsed.data.blocked_dates.length > 0) {
    const inserted = await supabase.from("listing_blocked_dates").insert(
      parsed.data.blocked_dates.map((span) => ({
        listing_id: id,
        start_date: span.start_date,
        end_date: span.end_date,
        note: span.note ?? null,
      })),
    );
    if (inserted.error) return jsonError(400, inserted.error.message);
  }

  try {
    return Response.json(await loadCalendar(supabase, id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the calendar";
    return jsonError(400, message);
  }
}
