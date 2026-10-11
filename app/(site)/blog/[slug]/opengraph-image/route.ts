import { getPost } from "@/lib/content/load";
import { postSocialImage } from "@/components/content/og-image";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const post = await getPost(slug);
  if (!post) return new Response("Not found", { status: 404 });
  return postSocialImage(post.title, post.category);
}
