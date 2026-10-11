import { BLOG_DESCRIPTION, BLOG_TITLE } from "./copy";
import type { Post } from "./types";

export function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderRss(posts: Post[], origin: string): string {
  const items = posts
    .map((post) => {
      const link = new URL(`/blog/${post.slug}`, origin).toString();
      const pubDate = new Date(`${post.date}T00:00:00.000Z`).toUTCString();
      return [
        "<item>",
        `<title>${xmlEscape(post.title)}</title>`,
        `<link>${xmlEscape(link)}</link>`,
        `<guid isPermaLink="true">${xmlEscape(link)}</guid>`,
        `<pubDate>${pubDate}</pubDate>`,
        `<description>${xmlEscape(post.description)}</description>`,
        `<category>${xmlEscape(post.category)}</category>`,
        "</item>",
      ].join("");
    })
    .join("");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${xmlEscape(BLOG_TITLE)}</title>`,
    `<link>${xmlEscape(new URL("/blog", origin).toString())}</link>`,
    `<description>${xmlEscape(BLOG_DESCRIPTION)}</description>`,
    items,
    "</channel>",
    "</rss>",
  ].join("");
}
