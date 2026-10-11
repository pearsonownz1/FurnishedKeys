/**
 * Checkout responses are a discriminated union.
 * The client picks a branch from the body, never from an environment flag.
 */
export type CheckoutPostResponse =
  | { waived: true; paid_through: string }
  | { client_secret: string };

export type CheckoutStatusResponse =
  | { status: "waived"; paid_through: string }
  | { status: string; paid_through: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function parseCheckoutPost(value: unknown): CheckoutPostResponse | null {
  if (!isRecord(value)) return null;
  if (value.waived === true) {
    if (typeof value.paid_through !== "string" || value.paid_through.length === 0) return null;
    return { waived: true, paid_through: value.paid_through };
  }
  if (typeof value.client_secret === "string" && value.client_secret.length > 0) {
    return { client_secret: value.client_secret };
  }
  return null;
}

/** 503, or an error that says payments are not configured. */
export function checkoutNotConfigured(status: number, body: unknown): boolean {
  if (status === 503) return true;
  if (!isRecord(body) || typeof body.error !== "string") return false;
  return /not configured|not set up/i.test(body.error);
}

export function parseCheckoutStatus(value: unknown): CheckoutStatusResponse | null {
  if (!isRecord(value) || typeof value.status !== "string" || value.status.length === 0) {
    return null;
  }
  if (value.status === "waived") {
    if (typeof value.paid_through !== "string" || value.paid_through.length === 0) return null;
    return { status: "waived", paid_through: value.paid_through };
  }
  if (value.paid_through != null && typeof value.paid_through !== "string") return null;
  return {
    status: value.status,
    paid_through: typeof value.paid_through === "string" ? value.paid_through : null,
  };
}

/** "Paid through Oct 2027" from an ISO timestamp, in UTC. */
export function paidThroughMonthYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Paid through";
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
  return `Paid through ${month} ${date.getUTCFullYear()}`;
}
