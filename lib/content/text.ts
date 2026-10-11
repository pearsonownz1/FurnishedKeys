import type { InlineNode } from "./types";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const postDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function categorySlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error(`Category "${name}" did not produce a URL slug`);
  }
  return slug;
}

export function readingMinutes(markdown: string): number {
  const plain = markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`[\]]/g, " ");
  const words = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatPostDate(isoDate: string): string {
  const match = DATE.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return postDate.format(date);
}

export function inlinePlain(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text") return node.value;
      if (node.type === "break") return "\n";
      return inlinePlain(node.children);
    })
    .join("");
}

export function externalLinkRel(url: string): "noopener noreferrer" | null {
  if (url.startsWith("http://") || url.startsWith("https://")) return "noopener noreferrer";
  return null;
}

export function postCallToAction(category: string): { href: "/owners" | "/rentals"; label: string } {
  if (categorySlug(category) === "landlords") {
    return { href: "/owners", label: "List your property" };
  }
  return { href: "/rentals", label: "Find a home" };
}
