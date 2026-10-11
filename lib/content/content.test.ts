import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { faqItems, faqPageJsonLd, parseFaq } from "./faq";
import { markdownBlocks } from "./markdown";
import { parseContent } from "./parse";
import { renderRss, xmlEscape } from "./rss";
import { categorySlug, externalLinkRel, postCallToAction, readingMinutes } from "./text";
import type { InlineNode, Post } from "./types";

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
