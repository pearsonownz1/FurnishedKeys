import { accessDenied, invalidBody, jsonError, readJson, requestOrigin } from "@/lib/api/http";
import { loadOwnerListing, sessionUser } from "@/lib/api/owner-listing";
import { feeCoversListing, requireOwner } from "@/lib/listings/access";
import {
  feeAlreadyRecorded,
  recordPlaceholderWaiver,
  waivedCheckoutBody,
} from "@/lib/listings/placeholder-fee";
import { checkoutSchema } from "@/lib/listings/schemas";
import { SELF_LIST_PRICE_CENTS } from "@/lib/pricing";
import {
  EMBEDDED_CHECKOUT_UI_MODE,
  getStripe,
  paymentsConfigured,
  paymentsNotReady,
  serverNotConfigured,
  stripePriceId,
} from "@/lib/stripe/config";
import { createServiceClient } from "@/lib/supabase/service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const { supabase, user } = await sessionUser();
  const listing = await loadOwnerListing(supabase, id);
  if (!listing) return jsonError(404, "Listing not found");
  const allowed = requireOwner(user?.id ?? null, listing.owner_id);
  if (!allowed.ok || !user) {
    return accessDenied(allowed.ok ? { ok: false, status: 401, error: "Sign in required" } : allowed);
  }

  if (!paymentsConfigured()) {
    if (feeAlreadyRecorded(listing.listing_fee_status)) {
      return Response.json(waivedCheckoutBody(listing.fee_paid_through));
    }
    const service = createServiceClient();
    if (!service) return serverNotConfigured();
    try {
      const body = await recordPlaceholderWaiver(service, listing, new Date());
      return Response.json(body);
    } catch {
      return jsonError(500, "Could not record the listing fee");
    }
  }

  if (feeCoversListing(listing, new Date()) && listing.stripe_subscription_id) {
    return jsonError(409, "This listing is already paid through the current period");
  }

  const stripe = getStripe();
  if (!stripe) return paymentsNotReady();

  let body: unknown = {};
  try {
    body = await readJson(request);
  } catch {
    return jsonError(400, "Invalid input");
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return invalidBody(parsed.error);
  const autoRenew = parsed.data.auto_renew !== false;

  const price = stripePriceId();
  const metadata = {
    listing_id: listing.id,
    owner_id: listing.owner_id,
    source: listing.source,
    auto_renew: autoRenew ? "true" : "false",
  };

  const session = await stripe.checkout.sessions.create({
    ui_mode: EMBEDDED_CHECKOUT_UI_MODE,
    mode: "subscription",
    branding_settings: {
      button_color: "#2e4a3b",
      font_family: "inter",
      border_style: "rectangular",
    },
    customer_email: user.email ?? undefined,
    return_url: `${requestOrigin(request)}/owners/listings/${id}/setup?session_id={CHECKOUT_SESSION_ID}`,
    metadata,
    subscription_data: { metadata },
    line_items: [
      price
        ? { price, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: SELF_LIST_PRICE_CENTS,
              recurring: { interval: "year" },
              product_data: { name: "FurnishedKeys listing fee" },
            },
          },
    ],
  });

  if (!session.client_secret) return jsonError(502, "Checkout did not return a client secret");
  return Response.json({ client_secret: session.client_secret });
}
