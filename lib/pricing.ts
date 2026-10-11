/** Yearly listing subscription, in cents. Server checkout still falls back to this when STRIPE_LISTING_PRICE_ID is unset. */
export const SELF_LIST_PRICE_CENTS = 19_900;

/** Shown wherever the listing fee used to be. The share of rent is not decided. */
export const FREE_TO_LIST = "Free to list. We only earn when you rent.";

export function listMyPropertyLabel(): string {
  return "List my property";
}
