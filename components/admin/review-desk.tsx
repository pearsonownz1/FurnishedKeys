"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CoverImage } from "@/components/cover-image";
import { formatCents } from "@/lib/money";
import { noteRequired } from "@/lib/owner-board";
import { measure, shortName, type AdminReview } from "@/lib/admin-console";

type ReviewRow = AdminReview & { submittedLabel: string };

export function ReviewDesk({
  queue,
  selectedId,
  missingRequested,
}: {
  queue: ReviewRow[];
  selectedId: string | null;
  missingRequested: boolean;
}) {
  const selected = queue.find((listing) => listing.id === selectedId) ?? queue[0] ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-20 md:overflow-hidden md:pb-0">
      <div className="flex min-h-0 flex-1 flex-col bg-white md:flex-row">
        <aside className="w-full shrink-0 border-b border-line md:w-80 md:overflow-y-auto md:border-r md:border-b-0">
          <h1 className="border-b border-line px-4 py-3.5 text-sm font-semibold">
            Waiting for review · {queue.length}
          </h1>
          {queue.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-muted">Nothing is waiting for review.</p>
          ) : (
            <ul>
              {queue.map((listing) => {
                const on = listing.id === selected?.id;
                return (
                  <li key={listing.id} className="border-b border-line">
                    <Link
                      href={`/admin/review?id=${listing.id}`}
                      aria-current={on ? "true" : undefined}
                      className={
                        on
                          ? "flex items-center gap-3 bg-bg px-4 py-3 shadow-[inset_3px_0_0_var(--pine)]"
                          : "flex items-center gap-3 px-4 py-3"
                      }
                    >
                      <span className="relative h-[52px] w-[72px] shrink-0 bg-stone">
                        <CoverImage src={listing.coverUrl} alt="" sizes="72px" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{listing.title}</span>
                        <span className="mt-0.5 block text-[13px] text-muted">
                          {shortName(listing.ownerName)}
                          {listing.city ? ` · ${listing.city}` : ""}
                        </span>
                        <span className="block text-[13px] text-muted">{listing.submittedLabel}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {missingRequested ? (
            <p className="border-b border-line px-6 py-3 text-[13px] text-muted">
              That listing is not waiting for review.
            </p>
          ) : null}
          {selected ? <Preview key={selected.id} listing={selected} /> : null}
        </div>
      </div>
    </div>
  );
}

function Preview({ listing }: { listing: ReviewRow }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const photos = listing.photos.length
    ? listing.photos
    : listing.coverUrl
      ? [{ src: listing.coverUrl, alt: listing.title }]
      : [];
  const photo = photos[index] ?? null;
  const stay =
    listing.minStayMonths === 1 ? "Min 1 month" : `Min ${listing.minStayMonths} months`;

  async function review(action: "approve" | "request_changes" | "reject") {
    if (action !== "approve") {
      const missing = noteRequired(note);
      if (missing) {
        setError(missing);
        return;
      }
    }
    setPending(true);
    setError(null);
    const response = await fetch(`/api/admin/listings/${listing.id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note: note.trim() || undefined }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response.ok) {
      setError(body?.error ?? "We couldn't update this listing.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="relative h-[250px] bg-stone">
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => {
              if (photos.length > 1) setIndex((current) => (current + 1) % photos.length);
            }}
            aria-label={photos.length > 1 ? "Next photo" : listing.title}
          >
            <CoverImage src={photo?.src ?? null} alt={photo?.alt ?? listing.title} sizes="80vw" priority />
          </button>
          {photos.length > 0 ? (
            <span className="absolute bottom-3.5 left-4 bg-white px-2 py-0.5 text-xs font-semibold">
              {index + 1} of {photos.length} photos
            </span>
          ) : null}
        </div>
        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <span className="inline-block bg-stone px-2 py-0.5 text-xs font-semibold">In review</span>
            <h2 className="mt-3 font-serif text-[32px] leading-none font-normal">{listing.title}</h2>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
              <p>
                <span className="font-serif text-lg text-ink">
                  {listing.monthlyRentCents == null ? "Rent not set" : formatCents(listing.monthlyRentCents)}
                </span>
                {listing.monthlyRentCents == null ? null : " / month"}
              </p>
              <p>
                {measure(listing.bedrooms)} bd · {measure(listing.bathrooms)} ba · {measure(listing.squareFeet)} sq ft
              </p>
              <p>{stay}</p>
              <p>Owner: {shortName(listing.ownerName)}</p>
            </div>
            {listing.description ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed">{listing.description}</p>
            ) : null}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Listing check</h3>
            <ul className="mt-3 grid gap-2 text-[13px]">
              {listing.checks.map((check) => (
                <li key={check.label} className="flex gap-2">
                  <span className={check.ok ? "font-bold text-pine" : "font-bold text-clay"} aria-hidden="true">
                    {check.ok ? "✓" : "!"}
                  </span>
                  <span>{check.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line px-6 py-3.5 sm:flex-row sm:items-center">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Note to owner (sent with Request changes)…"
          aria-label="Note to owner"
          className="min-w-0 flex-1 border border-line px-3 py-2.5 text-[13px]"
        />
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => void review("reject")}
            className="border border-[#e6cbbd] bg-white px-4 py-2.5 text-[13px] font-semibold text-clay disabled:opacity-70"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void review("request_changes")}
            className="border border-line bg-white px-4 py-2.5 text-[13px] font-semibold disabled:opacity-70"
          >
            Request changes
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void review("approve")}
            className="border border-pine bg-pine px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            Approve and publish
          </button>
        </div>
      </div>
      {error ? (
        <p className="px-6 pb-4 text-sm text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
