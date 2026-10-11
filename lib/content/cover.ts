export type Cover = {
  src: string;
  alt: string;
  shareSrc: string | null;
  photographer: string | null;
  license: string | null;
  licenseUrl: string | null;
  sourceUrl: string | null;
};

export type CreditRecord = {
  file: string;
  share_file: string;
  alt: string;
  photographer: string;
  license: string;
  license_url: string;
  source: string;
};

const COVER_SRC = /^\/blog\/covers\/(?:[A-Za-z0-9][A-Za-z0-9._-]*\/)*[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpe?g|png|webp|avif)$/;
const COVER_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.jpe?g$/;

export function coverKey(file: string): string {
  return file.replace(/\.jpe?g$/i, "");
}

export function sourceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "commons.wikimedia.org") return "Wikimedia Commons";
    return host;
  } catch {
    return "source";
  }
}

function publicCoverPath(file: string, fileLabel: string): string {
  if (!COVER_FILE.test(file) || file.includes("..")) {
    throw new Error(`${fileLabel} must name a jpeg in public/blog/covers/`);
  }
  return `/blog/covers/${file}`;
}

export function coverFromCredit(record: CreditRecord, fileLabel: string): Cover {
  if (typeof record.alt !== "string" || record.alt.length === 0) {
    throw new Error(`${fileLabel} is missing alt text`);
  }
  return {
    src: publicCoverPath(record.file, fileLabel),
    alt: record.alt,
    shareSrc: publicCoverPath(record.share_file, fileLabel),
    photographer: record.photographer || null,
    license: record.license || null,
    licenseUrl: record.license_url || null,
    sourceUrl: record.source || null,
  };
}

export function contentCover(input: {
  cover: string | null;
  coverAlt: string | null;
  coverCredit: string | null;
  coverCreditUrl: string | null;
  altFallback: string;
  fileLabel: string;
}): Cover | null {
  if (!input.cover) return null;
  const src = input.cover.startsWith("/") ? input.cover : `/${input.cover}`;
  if (src.includes("..") || !COVER_SRC.test(src)) {
    throw new Error(`${input.fileLabel} cover must be a file under public/blog/covers/`);
  }
  if (input.coverCreditUrl && !/^https?:\/\//.test(input.coverCreditUrl)) {
    throw new Error(`${input.fileLabel} coverCreditUrl must be an http(s) link`);
  }
  return {
    src,
    alt: input.coverAlt ?? input.altFallback,
    shareSrc: null,
    photographer: input.coverCredit,
    license: null,
    licenseUrl: null,
    sourceUrl: input.coverCreditUrl,
  };
}
