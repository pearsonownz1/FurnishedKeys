"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StripeEmbed } from "@/components/listing/stripe-embed";
import { checkoutNotConfigured, parseCheckoutPost } from "@/lib/checkout";
import { listingFeeAmount, listingFeePerYear } from "@/lib/pricing";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export function CheckoutPanel({
  listingId,
  title,
}: {
  listingId: string;
  title: string;
}) {
  const router = useRouter();
  const [autoRenew, setAutoRenew] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentsPendingSetup, setPaymentsPendingSetup] = useState(!publishableKey);

  async function pay(renew: boolean) {
    if (!publishableKey) {
      setPaymentsPendingSetup(true);
      return;
    }
    setPending(true);
    setError(null);
    setPaymentsPendingSetup(false);
    setClientSecret(null);
    const response = await fetch(`/api/listings/${listingId}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auto_renew: renew }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (checkoutNotConfigured(response.status, body)) {
      setPaymentsPendingSetup(true);
      setPending(false);
      return;
    }
    const parsed = parseCheckoutPost(body);
    if (!response.ok || !parsed) {
      setError("We couldn't start checkout. Please try again.");
      setPending(false);
      return;
    }
    if ("client_secret" in parsed) {
      setClientSecret(parsed.client_secret);
      setPending(false);
      return;
    }
    router.push(
      `/owners/listings/${listingId}/setup?paid_through=${encodeURIComponent(parsed.paid_through)}`,
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <p className="text-xs tracking-[0.14em] text-muted uppercase">Checkout</p>
        <h1 className="mt-3 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none font-normal tracking-[-0.8px]">
          {listingFeeAmount()} a year
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          {title.trim() || "Your listing"} stays in draft until this fee is recorded. Then we
          review it before it goes live.
        </p>
        <label className="mt-8 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={autoRenew}
            onChange={(event) => {
              const renew = event.target.checked;
              setAutoRenew(renew);
              if (clientSecret) void pay(renew);
            }}
          />
          <span>Renew automatically each year. You can turn this off later.</span>
        </label>
        {paymentsPendingSetup ? (
          <p className="mt-6 text-sm text-muted">Payments are being set up</p>
        ) : clientSecret ? (
          <div className="mt-6">
            <StripeEmbed clientSecret={clientSecret} publishableKey={publishableKey} />
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void pay(autoRenew)}
            className="mt-6 rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            Process payment
          </button>
        )}
        {error ? (
          <p className="mt-4 text-sm text-warn" role="alert">
            {error}{" "}
            <button type="button" className="font-semibold text-pine" onClick={() => void pay(autoRenew)}>
              Try again
            </button>
          </p>
        ) : null}
      </div>
      <aside className="h-fit border border-line bg-surface px-5 py-5">
        <h2 className="text-sm font-semibold">Order summary</h2>
        <p className="mt-3 text-sm">{title.trim() || "Listing fee"}</p>
        <p className="mt-4 font-serif text-4xl leading-none text-pine">{listingFeePerYear()}</p>
        <p className="mt-1 text-sm text-muted">per listing</p>
      </aside>
    </div>
  );
}
