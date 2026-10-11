"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewListingButton({
  locationId,
  className,
}: {
  locationId: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ location_id: locationId, property_type: "adu" }),
    });
    const body = (await response.json().catch(() => null)) as { listing_id?: string; error?: string } | null;
    setPending(false);
    if (!response.ok || !body?.listing_id) {
      setError(body?.error ?? "We couldn't start this listing. Please try again.");
      return;
    }
    router.push(`/owners/listings/${body.listing_id}/setup`);
  }

  return (
    <div className={className?.includes("mt-auto") ? "mt-auto" : undefined}>
      <button
        type="button"
        onClick={() => void create()}
        disabled={pending}
        className={`w-full disabled:opacity-70 ${className?.replace("mt-auto", "") ?? ""}`}
      >
        + New listing
      </button>
      {error ? (
        <p className="mt-2 text-xs text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
