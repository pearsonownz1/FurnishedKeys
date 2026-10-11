"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StripeEmbed } from "@/components/listing/stripe-embed";
import { parseCheckoutPost } from "@/lib/checkout";
import { listingFeePerYear } from "@/lib/pricing";

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

  async function processPayment() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/listings/${listingId}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auto_renew: autoRenew }),
    });
    const body: unknown = await response.json().catch(() => null);
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
      <div>
        <p className="text-xs tracking-[0.14em] text-muted uppercase">Checkout</p>
        <h1 className="mt-3 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none font-normal tracking-[-0.8px]">
          Pay the yearly fee
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          {title.trim() || "Your listing"} stays in draft until this fee is recorded. Then we
          review it before it goes live.
        </p>
        {clientSecret ? (
          <div className="mt-8">
            <StripeEmbed clientSecret={clientSecret} />
          </div>
        ) : (
          <label className="mt-8 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={autoRenew}
              onChange={(event) => setAutoRenew(event.target.checked)}
            />
            <span>Renew automatically each year. You can turn this off later.</span>
          </label>
        )}
        {error ? (
          <p className="mt-4 text-sm text-warn" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <aside className="h-fit border border-line bg-surface px-5 py-5">
        <h2 className="text-sm font-semibold">Order summary</h2>
        <p className="mt-3 text-sm">{title.trim() || "Listing fee"}</p>
        <p className="mt-4 font-serif text-4xl leading-none text-pine">{listingFeePerYear()}</p>
        <p className="mt-1 text-sm text-muted">per listing</p>
        {clientSecret ? null : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void processPayment()}
            className="mt-6 w-full rounded-[2px] bg-pine px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            Process payment
          </button>
        )}
      </aside>
    </div>
  );
}
