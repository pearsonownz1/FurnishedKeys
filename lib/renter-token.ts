import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes, URL-safe. Only the sha256 hex is stored. */
export function newRenterToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashRenterToken(raw) };
}

export function hashRenterToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
