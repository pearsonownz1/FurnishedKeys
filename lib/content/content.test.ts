import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contentCover, coverFromCredit, coverKey, sourceName, type CreditRecord } from "./cover";
import { faqItems, faqPageJsonLd, parseFaq } from "./faq";
import { markdownBlocks } from "./markdown";
import { parseContent } from "./parse";
import { renderRss, xmlEscape } from "./rss";
import { articleJsonLd, postMetadata, shareImageFor } from "./seo";
import { categorySlug, externalLinkRel, postCallToAction, readingMinutes } from "./text";
import type { InlineNode, Post } from "./types";

function jpegSize(file: string): { width: number; height: number } {
  const data = readFileSync(file);
  let offset = 2;
  while (offset < data.length - 8) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error(`No JPEG size in ${file}`);
}

function linksIn(nodes: InlineNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === "link") return [node.url, ...linksIn(node.children)];
    if (node.type === "text" || node.type === "break") return [];
    return linksIn(node.children);
  });
}

function markdownFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return path.endsWith(".md") ? [path] : [];
  });
}

const pageFiles = markdownFiles("content").filter(
  (file) => !file.endsWith("README.md") && !file.endsWith("nav-and-footer.md"),
);

describe("content files", () => {
  it("parses every content page and requires a title and description", () => {
    expect(pageFiles).toEqual(
      expect.arrayContaining([
        "content/faq.md",
        "content/help-center.md",
        "content/resources-renters.md",
        "content/resources-landlords.md",
      ]),
    );
    expect(pageFiles.filter((file) => file.startsWith("content/blog/"))).toEqual(
      expect.arrayContaining([
        "content/blog/bend-neighborhoods-for-a-monthly-stay.md",
        "content/blog/furnished-housing-near-st-charles-bend.md",
        "content/blog/what-monthly-rentals-cost-in-central-oregon.md",
      ]),
    );
    expect(pageFiles.filter((file) => file.startsWith("content/blog/"))).toHaveLength(8);

    for (const file of pageFiles) {
      const page = parseContent(readFileSync(file, "utf8"), file);
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.description.length).toBeGreaterThan(0);
      expect(markdownBlocks(page.body).length).toBeGreaterThan(0);
      if (file.startsWith("content/blog/")) {
        expect(page.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(page.category && categorySlug(page.category)).toBeTruthy();
        expect(page.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(page.author).toBeTruthy();
        expect(readingMinutes(page.body)).toBeGreaterThan(0);
      }
    }
  });

  it("keeps FAQ answers identical in the page schema and the source", () => {
    const page = parseContent(readFileSync("content/faq.md", "utf8"), "content/faq.md");
    const faq = parseFaq(page.body);
    const items = faqItems(faq);
    expect(items.length).toBeGreaterThan(0);
    const schema = faqPageJsonLd(items);
    expect(schema.mainEntity).toHaveLength(items.length);
    schema.mainEntity.forEach((entry, index) => {
      expect(entry.name).toBe(items[index]?.question);
      expect(entry.acceptedAnswer.text).toBe(items[index]?.answer);
      expect(items[index]?.answer).not.toContain("**");
    });
  });

  it("keeps numbered questions and chooses a call to action from the category", () => {
    const page = parseContent(
      readFileSync("content/blog/questions-to-ask-before-renting-furnished.md", "utf8"),
    );
    const starts = markdownBlocks(page.body).flatMap((block) =>
      block.type === "list" && block.ordered ? [block.start] : [],
    );
    expect(starts).toEqual([1, 5, 8, 11]);
    expect(postCallToAction("Renters")).toEqual({ href: "/rentals", label: "Find a home" });
    expect(postCallToAction("Landlords")).toEqual({ href: "/owners", label: "List your property" });
    expect(postCallToAction("Central Oregon")).toEqual({ href: "/rentals", label: "Find a home" });
  });

  it("keeps third-party rent sources as external links", () => {
    const page = parseContent(
      readFileSync("content/blog/what-monthly-rentals-cost-in-central-oregon.md", "utf8"),
    );
    expect(page.updated).toBe("2026-10-11");
    const urls = markdownBlocks(page.body).flatMap(function walk(block): string[] {
      if (block.type === "list") return block.items.flatMap((item) => item.flatMap(walk));
      if (block.type === "blockquote") return block.children.flatMap(walk);
      if (block.type === "paragraph" || block.type === "heading") return linksIn(block.children);
      return [];
    });
    expect(urls).toEqual(
      expect.arrayContaining([
        "https://www.zillow.com/rental-manager/market-trends/bend-or/",
        "https://www.zumper.com/rent-research/bend-or",
        "https://themovegenie.com/oregon/sisters/cost-of-living",
      ]),
    );
    for (const url of urls) {
      if (url.startsWith("http")) expect(externalLinkRel(url)).toBe("noopener noreferrer");
    }
    expect(externalLinkRel("/rentals")).toBeNull();
  });

  it("keeps covers optional and uses a file under public/blog/covers", () => {
    for (const file of pageFiles) {
      const page = parseContent(readFileSync(file, "utf8"), file);
      expect(page.cover).toBeNull();
    }

    const fields = {
      coverAlt: "A furnished living room",
      coverCredit: "Ada Lovelace",
      coverCreditUrl: "https://www.pexels.com/photo/example/",
      altFallback: "Post title",
      fileLabel: "content/blog/example.md",
    };
    expect(contentCover({ ...fields, cover: null })).toBeNull();
    expect(contentCover({ ...fields, cover: "blog/covers/example.jpg" })).toEqual({
      src: "/blog/covers/example.jpg",
      alt: "A furnished living room",
      shareSrc: null,
      photographer: "Ada Lovelace",
      license: null,
      licenseUrl: null,
      sourceUrl: "https://www.pexels.com/photo/example/",
    });
    const titled = contentCover({ ...fields, cover: "/blog/covers/nested/example.webp", coverAlt: null });
    expect(titled?.alt).toBe("Post title");
    expect(() => contentCover({ ...fields, cover: "https://images.example/cover.jpg" })).toThrow(
      /public\/blog\/covers/,
    );
    expect(() => contentCover({ ...fields, cover: "/blog/covers/../secret.jpg" })).toThrow(/public\/blog\/covers/);

    const post = {
      title: "Post title",
      description: "A description",
      slug: "example",
      category: "Renters",
      categorySlug: "renters",
      date: "2026-10-11",
      modified: "2026-10-11",
      author: "Furnished Keys Team",
      body: "",
      blocks: [],
      readingMinutes: 1,
      cover: contentCover({ ...fields, cover: "/blog/covers/example.jpg" }),
    } satisfies Post;
    const meta = postMetadata(post);
    expect(meta.openGraph && "images" in meta.openGraph ? meta.openGraph.images : null).toEqual([
      { url: "/blog/covers/example.jpg", width: 1600, height: 900, alt: "A furnished living room" },
    ]);
    expect(meta.twitter?.images).toEqual(["/blog/covers/example.jpg"]);
    expect(articleJsonLd(post).image).toEqual([
      "https://www.furnishedkeys.com/blog/covers/example.jpg",
    ]);

    const plain = { ...post, cover: null };
    const fallback = postMetadata(plain);
    expect(fallback.openGraph && "images" in fallback.openGraph ? fallback.openGraph.images : null).toEqual([
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Furnished Keys. Furnished homes. Flexible stays.",
      },
    ]);
    expect(articleJsonLd(plain).image).toEqual(["https://www.furnishedkeys.com/og.png"]);
  });

  it("uses the designer cover, share image, and credit for every post and guide", () => {
    const records = JSON.parse(readFileSync("content/credits.json", "utf8")) as CreditRecord[];
    expect(records).toHaveLength(12);
    const byKey = new Map(records.map((record) => [coverKey(record.file), record]));
    const slugs = pageFiles
      .filter((file) => file.startsWith("content/blog/"))
      .map((file) => parseContent(readFileSync(file, "utf8"), file).slug);
    for (const key of [...slugs, "faq", "help", "resources-renters", "resources-landlords"]) {
      expect(byKey.has(key ?? ""), `${key} is missing a cover`).toBe(true);
    }

    for (const record of records) {
      const cover = coverFromCredit(record, record.file);
      expect(cover.alt).toBe(record.alt);
      if (!cover.shareSrc) throw new Error(`${record.file} is missing a share image`);
      expect(jpegSize(`public${cover.src}`)).toEqual({ width: 1600, height: 900 });
      expect(jpegSize(`public${cover.shareSrc}`)).toEqual({ width: 1200, height: 630 });
      expect(shareImageFor(cover)).toEqual({
        url: cover.shareSrc,
        width: 1200,
        height: 630,
        alt: record.alt,
      });
      expect(sourceName(record.source)).toBe("Wikimedia Commons");
    }

    const landlords = coverFromCredit(
      records.find((record) => record.file === "resources-landlords.jpg") as CreditRecord,
      "resources-landlords.jpg",
    );
    expect(landlords.license).toBe("Public domain");
    expect(landlords.licenseUrl).toBeNull();
    expect(landlords.photographer).toBe("USGS/Cascades Volcano Observatory");
  });

  it("lists every post in the RSS feed", () => {
    expect(xmlEscape("a & b")).toBe("a &amp; b");
    const posts = pageFiles
      .filter((file) => file.startsWith("content/blog/"))
      .map((file) => {
        const page = parseContent(readFileSync(file, "utf8"), file);
        return {
          title: page.title,
          description: page.description,
          slug: page.slug ?? "",
          category: page.category ?? "",
          categorySlug: categorySlug(page.category ?? "Renters"),
          date: page.date ?? "2026-10-11",
          modified: page.updated ?? page.date ?? "2026-10-11",
          author: page.author ?? "",
          cover: contentCover({
            cover: page.cover,
            coverAlt: page.coverAlt,
            coverCredit: page.coverCredit,
            coverCreditUrl: page.coverCreditUrl,
            altFallback: page.title,
            fileLabel: file,
          }),
          body: page.body,
          blocks: [],
          readingMinutes: 1,
        } satisfies Post;
      });
    const xml = renderRss(posts, "https://www.furnishedkeys.com");
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    for (const post of posts) {
      expect(xml).toContain(xmlEscape(post.title));
      expect(xml).toContain(`https://www.furnishedkeys.com/blog/${post.slug}`);
    }
  });
});
