import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return walk(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("copy guard", () => {
  it("does not hard-code launch cities in components", () => {
    const files = [...walk("app"), ...walk("components")];
    const hits = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return /\b(Bend|Deschutes|Oregon)\b/.test(source) ? [file] : [];
    });
    expect(hits).toEqual([]);
  });

  it("does not mention a refund", () => {
    const files = [...walk("app"), ...walk("components")];
    const hits = files.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return /refund/i.test(source) ? [file] : [];
    });
    expect(hits).toEqual([]);
  });

  it("does not show a management price", () => {
    const pages = walk("app").filter((file) => file.includes("management"));
    expect(pages.length).toBeGreaterThan(0);
    for (const file of pages) {
      expect(readFileSync(file, "utf8")).not.toMatch(/\$\s?\d/);
    }
  });
});
