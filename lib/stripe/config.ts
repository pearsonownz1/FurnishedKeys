import Stripe from "stripe";

export const PAYMENTS_NOT_READY = "Payments are not set up yet";

/**
 * Embedded Checkout on API version 2026-09-30.endive.
 * Stripe names the inline card form `embedded_page` (the older value was `embedded`).
 */
export const EMBEDDED_CHECKOUT_UI_MODE = "embedded_page" as const;

export function paymentsConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function stripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

export function stripePriceId(): string | null {
  return process.env.STRIPE_LISTING_PRICE_ID || null;
}

export function paymentsNotReady(): Response {
  return Response.json({ error: PAYMENTS_NOT_READY }, { status: 503 });
}

export function serverNotConfigured(): Response {
  return Response.json({ error: "Server is not configured" }, { status: 503 });
}
