import { formatCents } from "@/lib/money";

/** Yearly listing subscription, in cents. Used when STRIPE_LISTING_PRICE_ID is unset. */
export const SELF_LIST_PRICE_CENTS = 19_900;

export function listingFeeAmount(): string {
  return formatCents(SELF_LIST_PRICE_CENTS);
}

/** "$199/year" */
export function listingFeePerYear(): string {
  return `${listingFeeAmount()}/year`;
}

/** "List my property — $199" */
export function listMyPropertyLabel(): string {
  return `List my property — ${listingFeeAmount()}`;
}

/** "$199/yr paid" */
export function listingFeePaidLabel(): string {
  return `${listingFeeAmount()}/yr paid`;
}

/** Small label under the $199 price. */
export function listingFeeCadenceLabel(): string {
  return "/year per listing";
}
