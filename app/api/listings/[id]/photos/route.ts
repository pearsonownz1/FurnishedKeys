import { accessDenied, invalidBody, jsonError, readJson } from "@/lib/api/http";
import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import { requireEditableListing } from "@/lib/listings/access";
import { listingPhotoPath, photoUploadSchema } from "@/lib/listings/schemas";
import { MAX_LISTING_PHOTOS, photosExceedLimit } from "@/lib/listings/setup";
import { LISTING_PHOTOS_BUCKET } from "@/lib/photos";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
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
  const parsed = photoUploadSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);

  const existing = await supabase
    .from("listing_photos")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", id);
  if (existing.error) return jsonError(400, existing.error.message);
  if (photosExceedLimit(existing.count ?? 0, parsed.data.files.length)) {
    return jsonError(422, `A listing can have at most ${MAX_LISTING_PHOTOS} photos`);
  }

  const uploads: { path: string; signedUrl: string; token: string }[] = [];
  for (const file of parsed.data.files) {
    const path = listingPhotoPath(id, file.name);
    if (!path) return jsonError(400, `Use a jpg, png, webp, or avif file name: ${file.name}`);

    const signed = await supabase.storage.from(LISTING_PHOTOS_BUCKET).createSignedUploadUrl(path);
    if (signed.error || !signed.data) {
      return jsonError(400, signed.error?.message ?? "Could not sign the upload");
    }

    const row = await supabase.from("listing_photos").insert({
      listing_id: id,
      storage_path: path,
    });
    if (row.error) return jsonError(400, row.error.message);

    uploads.push({
      path,
      signedUrl: signed.data.signedUrl,
      token: signed.data.token,
    });
  }

  return Response.json({ uploads });
}
