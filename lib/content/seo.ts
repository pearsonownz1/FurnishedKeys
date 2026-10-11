import type { Metadata } from "next";
import { SITE_ORIGIN, canonical } from "@/lib/site";
import { BLOG_DESCRIPTION, BLOG_TITLE } from "./copy";
import type { Cover } from "./cover";
import type { Post } from "./types";

export const DEFAULT_SHARE_IMAGE = {
  url: "/demo/hero.jpg",
  width: 1200,
  height: 800,
  alt: "Furnished living room with pines beyond the windows",
};

export function shareImageFor(cover: Cover | null) {
  if (!cover) return DEFAULT_SHARE_IMAGE;
  if (cover.shareSrc) return { url: cover.shareSrc, width: 1200, height: 630, alt: cover.alt };
  return { url: cover.src, width: 1600, height: 900, alt: cover.alt };
}

export { BLOG_DESCRIPTION, BLOG_TITLE };

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  cover?: Cover | null;
}): Metadata {
  const image = shareImageFor(input.cover ?? null);
  return {
    title: { absolute: input.title },
    description: input.description,
    ...canonical(input.path),
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.path,
      type: "website",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image.url],
    },
  };
}

export function blogIndexMetadata(): Metadata {
  return {
    ...pageMetadata({ title: BLOG_TITLE, description: BLOG_DESCRIPTION, path: "/blog" }),
    alternates: {
      canonical: "/blog",
      types: {
        "application/rss+xml": "/blog/rss.xml",
      },
    },
  };
}

export function postMetadata(post: Post): Metadata {
  const path = `/blog/${post.slug}`;
  const image = shareImageFor(post.cover);
  const published = `${post.date}T00:00:00.000Z`;
  const modified = `${post.modified}T00:00:00.000Z`;
  return {
    title: { absolute: post.title },
    description: post.description,
    ...canonical(path),
    openGraph: {
      title: post.title,
      description: post.description,
      url: path,
      type: "article",
      publishedTime: published,
      modifiedTime: modified,
      authors: [post.author],
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image.url],
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, SITE_ORIGIN).toString(),
    })),
  };
}

export function articleJsonLd(post: Post) {
  const url = new URL(`/blog/${post.slug}`, SITE_ORIGIN).toString();
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.modified,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    image: [new URL(shareImageFor(post.cover).url, SITE_ORIGIN).toString()],
    mainEntityOfPage: url,
  };
}
