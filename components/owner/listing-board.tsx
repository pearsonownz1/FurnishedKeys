"use client";

import { useState } from "react";
import {
  endsOnLabel,
  formatMonthDayYear,
  paidOnLabel,
  paidThroughLabel,
  showsPaidThrough,
  statusLabel,
  type BoardInquiry,
  type BoardListing,
} from "@/lib/owner-board";

export function ListingBoard({
  listings,
  inquiries,
}: {
  listings: BoardListing[];
  inquiries: BoardInquiry[];
}) {
  const [rows, setRows] = useState(listings);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const confirming = rows.find((row) => row.id === confirmId) ?? null;

  async function changeRenewal(id: string, cancel: boolean) {
    const previous = rows;
    setError(null);
    setPendingId(id);
    setRows(rows.map((row) => (row.id === id ? { ...row, renewalCanceled: cancel } : row)));
    const response = await fetch(`/api/listings/${id}/cancel-renewal`, {
      method: cancel ? "POST" : "DELETE",
    });
    if (!response.ok) {
      setRows(previous);
      setError("We couldn't update the renewal. Nothing changed.");
    }
    setPendingId(null);
    setConfirmId(null);
  }

  return (
    <div>
      {error ? (
        <p className="mb-4 text-sm text-warn" role="alert">
          {error}
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="border border-line bg-surface px-5 py-6 text-sm text-muted">
          No listings yet.
        </p>
      ) : (
        <ul className="border border-line bg-surface">
          {rows.map((listing) => (
            <li key={listing.id} className="border-b border-line px-4 py-5 last:border-b-0 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{listing.title}</h2>
                    <StatusPill status={listing.status} />
                  </div>
                  {listing.area ? <p className="mt-1 text-sm text-muted">{listing.area}</p> : null}
                  {listing.status === "in_review" && listing.paidAt ? (
                    <p className="mt-2 text-sm">{paidOnLabel(listing.paidAt)}</p>
                  ) : null}
                  {showsPaidThrough(listing.status) && listing.feePaidThrough ? (
                    <p className="mt-1 text-sm">{paidThroughLabel(listing.feePaidThrough)}</p>
                  ) : null}
                  {listing.status === "live" && listing.renewalCanceled && listing.feePaidThrough ? (
                    <p className="mt-1 text-sm text-warn">
                      {endsOnLabel(listing.feePaidThrough)}
                      {" · "}
                      <button
                        type="button"
                        className="font-semibold underline"
                        disabled={pendingId === listing.id}
                        onClick={() => void changeRenewal(listing.id, false)}
                      >
                        Renew
                      </button>
                    </p>
                  ) : null}
                  {listing.status === "changes_requested" && listing.adminNote ? (
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{listing.adminNote}</p>
                  ) : null}
                </div>
                {listing.status === "live" && !listing.renewalCanceled && listing.feePaidThrough ? (
                  <details className="relative shrink-0">
                    <summary className="cursor-pointer list-none rounded-[2px] border border-line px-3 py-2 text-sm">
                      Edit
                    </summary>
                    <div className="absolute right-0 z-10 mt-1 w-56 border border-line bg-surface p-1 shadow-search">
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
                        onClick={() => setConfirmId(listing.id)}
                      >
                        Turn off yearly renewal
                      </button>
                    </div>
                  </details>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-14 font-serif text-[clamp(2rem,4vw,2.75rem)] leading-none font-normal tracking-[-0.6px]">
        New inquiries
      </h2>
      {inquiries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No new inquiries.</p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {inquiries.map((inquiry) => (
            <li id={`inquiry-${inquiry.id}`} key={inquiry.id} className="border border-line bg-surface px-5 py-5">
              <p className="text-xs tracking-[0.12em] text-muted uppercase">{inquiry.listingTitle}</p>
              <p className="mt-2 font-semibold">{inquiry.name}</p>
              <p className="mt-2 text-sm leading-relaxed">{inquiry.message}</p>
              <p className="mt-3 text-xs text-muted">{formatMonthDayYear(inquiry.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}

      {confirming?.feePaidThrough ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="renewal-title" className="w-full max-w-md bg-surface px-6 py-6 shadow-search">
            <h2 id="renewal-title" className="font-serif text-3xl leading-none font-normal">
              Turn off yearly renewal?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              This listing stays live through {formatMonthDayYear(confirming.feePaidThrough)}.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="rounded-[2px] border border-line px-4 py-2.5 text-sm" onClick={() => setConfirmId(null)}>
                Keep it on
              </button>
              <button
                type="button"
                className="rounded-[2px] bg-pine px-4 py-2.5 text-sm font-semibold text-white"
                disabled={pendingId === confirming.id}
                onClick={() => void changeRenewal(confirming.id, true)}
              >
                Turn off renewal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: BoardListing["status"] }) {
  const tone =
    status === "live"
      ? "bg-pine-l text-pine-d"
      : status === "changes_requested" || status === "rejected"
        ? "bg-stone text-warn"
        : "bg-stone text-ink";
  return (
    <span className={`rounded-[2px] px-2 py-0.5 text-xs font-semibold ${tone}`}>{statusLabel(status)}</span>
  );
}
