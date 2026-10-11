"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { republishListing, unpublishListing } from "@/app/(site)/admin/actions";
import type { ListingStatus } from "@/lib/db/types";

function buttonLabel(pending: boolean, live: boolean): string {
  if (pending) return "Saving…";
  if (live) return "Unpublish";
  return "Republish";
}

export function ListingPublication({ id, status }: { id: string; status: ListingStatus }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (status !== "approved" && status !== "archived") return null;
  const live = status === "approved";

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setSaved(false);
          setError(null);
          void (live ? unpublishListing(id) : republishListing(id)).then((result) => {
            setPending(false);
            if (!result.ok) {
              setError(result.formError ?? "We couldn't update this listing. Please try again.");
              return;
            }
            setSaved(true);
            router.refresh();
          });
        }}
        className="font-semibold text-ink disabled:opacity-70"
      >
        {buttonLabel(pending, live)}
      </button>
      {saved ? <span className="text-xs text-pine">Saved</span> : null}
      {error ? (
        <p className="basis-full text-xs text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
