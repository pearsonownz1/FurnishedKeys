import matter from "gray-matter";

export type ParsedContent = {
  title: string;
  description: string;
  slug: string | null;
  category: string | null;
  date: string | null;
  updated: string | null;
  author: string | null;
  body: string;
};

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

export function parseContent(raw: string, fileLabel = "content file"): ParsedContent {
  const parsed = matter(raw);
  const title = asString(parsed.data.title);
  const description = asString(parsed.data.description);
  if (!title) throw new Error(`${fileLabel} is missing a title`);
  if (!description) throw new Error(`${fileLabel} is missing a description`);
  return {
    title,
    description,
    slug: asString(parsed.data.slug),
    category: asString(parsed.data.category),
    date: asString(parsed.data.date),
    updated: asString(parsed.data.updated),
    author: asString(parsed.data.author),
    body: parsed.content.replace(/^\n/, "").trimEnd(),
  };
}
