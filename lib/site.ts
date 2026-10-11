import type { Metadata } from "next";

export const SITE_ORIGIN = "https://www.furnishedkeys.com";

export function canonical(path: string): Pick<Metadata, "alternates"> {
  return { alternates: { canonical: path } };
}

export function ownerListingPath(id: string, leaf?: "setup" | "plan" | "checkout"): string {
  const base = `/owners/listings/${id}`;
  return leaf ? `${base}/${leaf}` : base;
}
