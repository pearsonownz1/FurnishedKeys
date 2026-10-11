"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { StripeEmbed } from "@/components/listing/stripe-embed";
import { parseCheckoutPost } from "@/lib/checkout";
import { listingFeeAmount, listingFeeExact } from "@/lib/pricing";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export function CheckoutPanel({
  listingId,
  propertyType,
  placeLabel,
}: {
  listingId: string;
  propertyType: string;
  placeLabel: string;
}) {
  const router = useRouter();
  const [autoRenew, setAutoRenew] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const where = [propertyType, placeLabel].filter(Boolean).join(" in ");
  const price = listingFeeExact();
  const signInHref = `/sign-in?next=${encodeURIComponent(`/owners/listings/${listingId}/checkout`)}`;

  async function pay(renew: boolean) {
    setPending(true);
    setError(null);
    setNeedsSignIn(false);
    const response = await fetch(`/api/listings/${listingId}/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auto_renew: renew }),
    });
    const body: unknown = await response.json().catch(() => null);
    const parsed = parseCheckoutPost(body);
    if (!response.ok || !parsed) {
      console.error("checkout", response.status, body);
      setClientSecret(null);
      setNeedsSignIn(response.status === 401);
      setError(response.status === 401 ? null : checkoutError(body, response.status));
      setPending(false);
      return;
    }
    if ("client_secret" in parsed) {
      if (!publishableKey) {
        console.error("checkout", response.status, "client_secret without publishable key");
        setClientSecret(null);
        setError("Checkout returned a payment session, but the publishable key is not set.");
        setPending(false);
        return;
      }
      setClientSecret(parsed.client_secret);
      setPending(false);
      return;
    }
    router.push(
      `/owners/listings/${listingId}/setup?paid_through=${encodeURIComponent(parsed.paid_through)}`,
    );
  }

  const showCard = Boolean(clientSecret && publishableKey);

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
      <div className="min-w-0 px-5 py-12 md:px-10 lg:py-16 lg:pr-16 lg:pl-[max(1.25rem,calc((100vw-1200px)/2))]">
        <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none font-normal tracking-[-0.8px]">
          Pay and start your listing
        </h1>
        <label className="mt-8 flex max-w-xl items-start gap-3 rounded-[2px] border border-line px-4 py-4 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={autoRenew}
            onChange={(event) => {
              const renew = event.target.checked;
              setAutoRenew(renew);
              if (showCard) void pay(renew);
            }}
          />
          <span>
            <span className="block">Renew automatically each year.</span>
            <span className="mt-1 block text-muted">You can turn this off later.</span>
          </span>
        </label>
        {showCard && clientSecret ? (
          <div className="mt-6 max-w-xl">
            <StripeEmbed clientSecret={clientSecret} publishableKey={publishableKey} />
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void pay(autoRenew)}
            className="mt-6 rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            Pay {listingFeeAmount()} and set up my listing
          </button>
        )}
        {needsSignIn ? (
          <p className="mt-4 text-sm text-warn" role="alert">
            Your session ended.{" "}
            <Link href={signInHref} className="font-semibold text-pine">
              Sign in
            </Link>{" "}
            to continue
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 text-sm text-warn" role="alert">
            {error}{" "}
            <button type="button" className="font-semibold text-pine" onClick={() => void pay(autoRenew)}>
              Try again
            </button>
          </p>
        ) : null}
      </div>
      <aside className="bg-stone px-6 py-12 md:px-8 lg:py-16">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm">Listing{where ? ` · ${where}` : ""}</p>
          <p className="text-sm">{price}</p>
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-4 text-sm">
          <p>Term</p>
          <p>1 year</p>
        </div>
        <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-line pt-4 text-sm font-semibold">
          <p>Due today</p>
          <p>{price}</p>
        </div>
        <p className="mt-6 text-sm leading-relaxed text-muted">
          Next, you&apos;ll add photos…
        </p>
      </aside>
    </div>
  );
}

function checkoutError(body: unknown, status: number): string {
  if (body && typeof body === "object" && "error" in body) {
    const message = (body as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }
  return `Checkout failed (${status}).`;
}
