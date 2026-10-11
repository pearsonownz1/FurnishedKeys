import type { MetadataRoute } from "next";
import { getPublicListings } from "@/lib/listings";
import { SITE_ORIGIN } from "@/lib/site";

const staticPaths = ["/", "/rentals", "/owners", "/management", "/about"] as const;

function isIndexable(url: string): boolean {
  const pathname = new URL(url).pathname.replace(/\/$/, "") || "/";
  return pathname !== "/letter";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let listings: { slug: string; updated_at: string }[] = [];
  try {
    listings = await getPublicListings();
  } catch {
    listings = [];
  }

  return [
    ...staticPaths.map((path) => ({
      url: new URL(path, SITE_ORIGIN).toString(),
    })),
    ...listings.map((listing) => ({
      url: `${SITE_ORIGIN}/rentals/${listing.slug}`,
      lastModified: listing.updated_at,
    })),
  ].filter((entry) => isIndexable(entry.url));
}
