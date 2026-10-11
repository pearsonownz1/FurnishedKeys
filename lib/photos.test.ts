import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("listing photos", () => {
  it("batch-signs the private bucket and never builds a public url", () => {
    const source = readFileSync(new URL("./photos.ts", import.meta.url), "utf8");
    expect(source).toContain('LISTING_PHOTOS_BUCKET = "listing-photos"');
    expect(source).toContain("createSignedUrls");
    expect(source).not.toMatch(/\.getPublicUrl\(/);
  });
});
