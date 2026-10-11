import { accessDenied, invalidBody, jsonError, readJson, requestOrigin } from "@/lib/api/http";
import { loadRole, sessionUser } from "@/lib/api/owner-listing";
import { performListingReview } from "@/lib/admin-review";
import { requireAdmin } from "@/lib/listings/access";
import { reviewSchema } from "@/lib/listings/schemas";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await sessionUser();
  if (!user) return jsonError(401, "Sign in required");
  const role = await loadRole(supabase, user.id);
  const allowed = requireAdmin(user.id, role);
  if (!allowed.ok) return accessDenied(allowed);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid input");
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);

  const result = await performListingReview({
    supabase,
    reviewerId: user.id,
    listingId: id,
    action: parsed.data.action,
    note: parsed.data.note ?? null,
    origin: requestOrigin(request),
  });
  if (!result.ok) {
    return jsonError(
      result.status,
      result.error,
      result.missing ? { missing: result.missing } : undefined,
    );
  }
  return Response.json({ listing: result.listing });
}
