import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  const body = await readFile(
    join(process.cwd(), "node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs"),
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
