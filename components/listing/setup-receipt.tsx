"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { paidThroughMonthYear, parseCheckoutStatus } from "@/lib/checkout";

export function SetupReceipt({
  listingId,
  title,
  initialPaidThrough,
}: {
  listingId: string;
  title: string;
  initialPaidThrough: string | null;
}) {
  const [paidThrough, setPaidThrough] = useState(initialPaidThrough);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : "";
    let cancelled = false;

    void (async () => {
      const statusResponse = await fetch(`/api/listings/${listingId}/checkout/status${query}`);
      if (statusResponse.ok) {
        const parsed = parseCheckoutStatus(await statusResponse.json());
        if (!cancelled && parsed?.paid_through) setPaidThrough(parsed.paid_through);
      }
      await fetch(`/api/listings/${listingId}/submit`, { method: "POST" });
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  return (
    <div className="max-w-xl">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">Listing fee</p>
      <h1 className="mt-3 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none font-normal tracking-[-0.8px]">
        {title.trim() || "Your listing"}
      </h1>
      {paidThrough ? (
        <p className="mt-5 inline-block rounded-[2px] bg-pine-l px-2.5 py-1 text-sm font-semibold text-pine-d">
          {paidThroughMonthYear(paidThrough)}
        </p>
      ) : null}
      <p className="mt-5 text-[15px] leading-relaxed text-muted">
        The listing is in review. We publish it only after it is approved.
      </p>
      <p className="mt-8">
        <Link href="/owner" className="font-semibold text-pine">
          Go to your listings
        </Link>
      </p>
    </div>
  );
}
