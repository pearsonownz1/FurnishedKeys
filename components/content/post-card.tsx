import Link from "next/link";
import { formatPostDate } from "@/lib/content/text";
import type { Post } from "@/lib/content/types";

export function PostCard({
  post,
}: {
  post: Pick<Post, "title" | "description" | "slug" | "category" | "categorySlug" | "date" | "readingMinutes">;
}) {
  return (
    <article className="flex h-full flex-col border border-line bg-surface p-6">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">
        <Link href={`/blog/category/${post.categorySlug}`} className="hover:text-ink">
          {post.category}
        </Link>
      </p>
      <h2 className="mt-3 font-serif text-[1.65rem] leading-[1.15] font-normal tracking-[-0.4px] sm:text-[1.85rem]">
        <Link href={`/blog/${post.slug}`} className="hover:text-pine">
          {post.title}
        </Link>
      </h2>
      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted">{post.description}</p>
      <p className="mt-5 text-sm text-muted">
        <time dateTime={post.date}>{formatPostDate(post.date)}</time>
        <span aria-hidden="true"> · </span>
        {post.readingMinutes} min read
      </p>
    </article>
  );
}

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {posts.map((post) => (
        <li key={post.slug} className="h-full">
          <PostCard post={post} />
        </li>
      ))}
    </ul>
  );
}
