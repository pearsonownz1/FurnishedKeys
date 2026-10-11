const FALLBACK = "/owner";

/** Relative same-origin path. Anything else becomes /owner. */
export function safeNext(value: string | null | undefined): string {
  return requestedNext(value) ?? FALLBACK;
}

/** A same-origin relative path from ?next, or null when it is missing or unsafe. */
export function requestedNext(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(trimmed, "https://furnishedkeys.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://furnishedkeys.invalid") return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Admins land on the admin overview. Every other signed-in role lands on their listings. */
export function dashboardForRole(role: string | null | undefined): string {
  return role === "admin" ? "/admin" : "/owner";
}
