import type { ZodError } from "zod";
import type { AccessDenial } from "@/lib/listings/access";

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return Response.json({ error, ...extra }, { status });
}

export function accessDenied(denial: AccessDenial) {
  return jsonError(denial.status, denial.error);
}

export function invalidBody(error: ZodError) {
  return jsonError(400, "Invalid input", { issues: error.flatten() });
}

export function requestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  return new URL(request.url).origin;
}

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  return JSON.parse(text) as unknown;
}
