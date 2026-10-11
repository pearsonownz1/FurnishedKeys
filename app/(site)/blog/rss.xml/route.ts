import { getPosts } from "@/lib/content/load";
import { renderRss } from "@/lib/content/rss";
import { SITE_ORIGIN } from "@/lib/site";

export async function GET() {
  const posts = await getPosts();
  return new Response(renderRss(posts, SITE_ORIGIN), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
