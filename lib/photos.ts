import { createPublicClient } from "@/lib/supabase/public";

/** Private Storage bucket. Serve files with a signed URL batch per listing. */
export const LISTING_PHOTOS_BUCKET = "listing-photos";

export const LISTING_PHOTO_TTL_SECONDS = 60 * 60;

/**
 * One signed-url batch for a single listing's storage paths.
 * Paths that fail to sign are omitted. Callers show a placeholder for those.
 */
export async function signListingPhotoPaths(
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.map((path) => path.trim()).filter(Boolean))];
  const urls = new Map<string, string>();
  if (unique.length === 0) return urls;

  const remote = unique.filter((path) => !path.startsWith("demo/"));
  for (const path of unique) {
    if (path.startsWith("demo/")) urls.set(path, `/${path}`);
  }
  if (remote.length === 0) return urls;

  const supabase = createPublicClient();
  const { data, error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .createSignedUrls(remote, LISTING_PHOTO_TTL_SECONDS);

  if (error || !data) return urls;

  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) {
      urls.set(item.path, item.signedUrl);
    }
  }
  return urls;
}

/** Batch-sign each listing's photos with its own createSignedUrls call. */
export async function signedPhotoUrls(
  listings: { photos: { storage_path: string }[] }[],
): Promise<Map<string, string>> {
  const batches = await Promise.all(
    listings.map((listing) =>
      signListingPhotoPaths(listing.photos.map((photo) => photo.storage_path)),
    ),
  );
  const urls = new Map<string, string>();
  for (const batch of batches) {
    for (const [path, url] of batch) urls.set(path, url);
  }
  return urls;
}
