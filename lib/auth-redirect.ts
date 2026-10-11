const FALLBACK = "/owner";

/** Relative same-origin path. Anything else becomes /owner. */
export function safeNext(value: string | null | undefined): string {
  if (!value) return FALLBACK;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return FALLBACK;
  }
  let url: URL;
  try {
    url = new URL(trimmed, "https://furnishedkeys.invalid");
  } catch {
    return FALLBACK;
  }
  if (url.origin !== "https://furnishedkeys.invalid") return FALLBACK;
  return `${url.pathname}${url.search}${url.hash}`;
}
