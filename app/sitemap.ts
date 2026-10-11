import type { MetadataRoute } from "next";
import { getCategories, getPosts } from "@/lib/content/load";
import { getPublicListings } from "@/lib/listings";
import { SITE_ORIGIN } from "@/lib/site";

const staticPaths = [
  "/",
  "/rentals",
  "/owners",
  "/management",
  "/about",
  "/blog",
  "/faq",
  "/help",
  "/resources/renters",
  "/resources/landlords",
] as const;

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

  const posts = await getPosts();
  const categories = await getCategories();

  return [
    ...staticPaths.map((path) => ({
      url: new URL(path, SITE_ORIGIN).toString(),
    })),
    ...posts.map((post) => ({
      url: `${SITE_ORIGIN}/blog/${post.slug}`,
      lastModified: post.modified,
    })),
    ...categories.map((category) => ({
      url: `${SITE_ORIGIN}/blog/category/${category.slug}`,
    })),
    ...listings.map((listing) => ({
      url: `${SITE_ORIGIN}/rentals/${listing.slug}`,
      lastModified: listing.updated_at,
    })),
  ].filter((entry) => isIndexable(entry.url));
}
