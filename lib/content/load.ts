import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cacheLife } from "next/cache";
import { parseFaq } from "./faq";
import { markdownBlocks } from "./markdown";
import { parseContent } from "./parse";
import { categorySlug, readingMinutes } from "./text";
import type { Category, ContentPage, ContentPageId, FaqDocument, Post } from "./types";

const CONTENT_ROOT = path.join(process.cwd(), "content");
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set(["category", "rss.xml"]);

const PAGE_FILES: Record<ContentPageId, string> = {
  faq: "faq.md",
  help: "help-center.md",
  renters: "resources-renters.md",
  landlords: "resources-landlords.md",
};

function comparePosts(left: Post, right: Post): number {
  if (left.date !== right.date) return left.date < right.date ? 1 : -1;
  return left.title.localeCompare(right.title);
}

function toPost(raw: string, fileName: string): Post {
  const parsed = parseContent(raw, `content/blog/${fileName}`);
  if (!parsed.slug || !SLUG.test(parsed.slug) || RESERVED_SLUGS.has(parsed.slug)) {
    throw new Error(`content/blog/${fileName} needs a lowercase hyphenated slug`);
  }
  if (!parsed.category) throw new Error(`content/blog/${fileName} is missing a category`);
  if (!parsed.date || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
    throw new Error(`content/blog/${fileName} needs a YYYY-MM-DD date`);
  }
  if (parsed.updated && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.updated)) {
    throw new Error(`content/blog/${fileName} needs a YYYY-MM-DD updated date`);
  }
  if (!parsed.author) throw new Error(`content/blog/${fileName} is missing an author`);
  return {
    title: parsed.title,
    description: parsed.description,
    slug: parsed.slug,
    category: parsed.category,
    categorySlug: categorySlug(parsed.category),
    date: parsed.date,
    modified: parsed.updated ?? parsed.date,
    author: parsed.author,
    body: parsed.body,
    blocks: markdownBlocks(parsed.body),
    readingMinutes: readingMinutes(parsed.body),
  };
}

export async function getPosts(): Promise<Post[]> {
  "use cache";
  cacheLife("max");
  const dir = path.join(CONTENT_ROOT, "blog");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".md")).sort();
  const posts = await Promise.all(
    files.map(async (file) => toPost(await readFile(path.join(dir, file), "utf8"), file)),
  );
  const seen = new Set<string>();
  for (const post of posts) {
    if (seen.has(post.slug)) throw new Error(`Duplicate blog slug: ${post.slug}`);
    seen.add(post.slug);
  }
  return posts.sort(comparePosts);
}

export async function getPost(slug: string): Promise<Post | null> {
  const posts = await getPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getCategories(): Promise<Category[]> {
  const posts = await getPosts();
  const categories = new Map<string, Category>();
  for (const post of posts) {
    const existing = categories.get(post.categorySlug);
    if (existing) existing.posts.push(post);
    else categories.set(post.categorySlug, { name: post.category, slug: post.categorySlug, posts: [post] });
  }
  return [...categories.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export async function getCategory(slug: string): Promise<Category | null> {
  const categories = await getCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

export async function getContentPage(id: ContentPageId): Promise<ContentPage> {
  "use cache";
  cacheLife("max");
  const file = PAGE_FILES[id];
  const raw = await readFile(path.join(CONTENT_ROOT, file), "utf8");
  const parsed = parseContent(raw, `content/${file}`);
  return {
    id,
    title: parsed.title,
    description: parsed.description,
    body: parsed.body,
    blocks: markdownBlocks(parsed.body),
  };
}

export async function getFaq(): Promise<FaqDocument & { seoTitle: string; description: string }> {
  const page = await getContentPage("faq");
  return { ...parseFaq(page.body), seoTitle: page.title, description: page.description };
}

export function relatedPosts(posts: Post[], post: Post, limit = 3): Post[] {
  return posts.filter((item) => item.slug !== post.slug && item.categorySlug === post.categorySlug).slice(0, limit);
}
