import { revalidatePath } from "next/cache";

/** Drops the public catalog caches after a listing leaves or joins them. */
export function revalidateListingPaths(slug: string | null | undefined) {
  if (slug) revalidatePath(`/rentals/${slug}`);
  revalidatePath("/rentals");
  revalidatePath("/");
}
