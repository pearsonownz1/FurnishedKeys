"use client";

import { useState } from "react";
import { formatCents } from "@/lib/money";
import { noteRequired, queueFeeLabel, statusLabel } from "@/lib/owner-board";
import type { ReviewModel } from "@/lib/admin-queue";

const checks = [
  "Description and rent are complete",
  "Fees are listed separately from rent",
  "The public view hides the street address",
] as const;

export function ReviewDetail({ listing }: { listing: ReviewModel }) {
  const [row, setRow] = useState(listing);
  const [note, setNote] = useState(listing.adminNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    const response = await fetch(`/api/admin/listings/${row.id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, note: note.trim() || undefined }),
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      listing?: { status?: ReviewModel["rawStatus"]; admin_note?: string | null; listing_fee_status?: ReviewModel["feeStatus"]; renewal_canceled?: boolean };
    } | null;
    setPending(false);
    if (!response.ok || !body?.listing) {
      setError(body?.error ?? "We couldn't update this listing.");
      return;
    }
    setRow((current) => ({
      ...current,
      rawStatus: body.listing?.status ?? current.rawStatus,
      status:
        body.listing?.status === "approved"
          ? "live"
          : body.listing?.status === "changes_requested"
            ? "changes_requested"
            : body.listing?.status === "rejected"
              ? "rejected"
              : current.status,
      adminNote: body.listing?.admin_note ?? note.trim(),
      feeStatus: body.listing?.listing_fee_status ?? current.feeStatus,
      renewalCanceled: body.listing?.renewal_canceled ?? current.renewalCanceled,
    }));
    setMenuOpen(false);
  }

  async function waive() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/admin/listings/${row.id}/waive`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      listing?: { listing_fee_status?: ReviewModel["feeStatus"] };
    } | null;
    setPending(false);
    if (!response.ok) {
      setError(body?.error ?? "We couldn't waive the fee.");
      return;
    }
    setRow((current) => ({ ...current, feeStatus: body?.listing?.listing_fee_status ?? "waived" }));
    setMenuOpen(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border border-line bg-surface px-5 py-5">
          <h2 className="text-sm font-semibold">Public view</h2>
          <p className="mt-3 text-lg font-semibold">{row.title}</p>
          {row.area ? <p className="mt-1 text-sm text-muted">{row.area}</p> : null}
          {row.description ? <p className="mt-3 text-sm leading-relaxed">{row.description}</p> : null}
          <p className="mt-3 text-sm">
            {row.monthlyRentCents == null ? "Rent not set" : `${formatCents(row.monthlyRentCents)} / month`}
          </p>
          <ul className="mt-2 text-sm text-muted">
            {row.fees.map((fee) => (
              <li key={fee.id}>
                {fee.label} {formatCents(fee.amountCents)}
              </li>
            ))}
          </ul>
        </section>
        <section className="border border-line bg-surface px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold">Street address</h2>
            <span className="rounded-[2px] bg-stone px-2 py-0.5 text-[11px] text-muted">Owner & admin only</span>
          </div>
          <p className="mt-3 text-sm">{row.addressPrivate || "No street address yet."}</p>
        </section>
      </div>
      <aside className="h-fit border border-line bg-surface px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[2px] bg-stone px-2 py-0.5 text-xs font-semibold">{statusLabel(row.status)}</span>
          <span className="text-sm text-muted">{queueFeeLabel(row.feeStatus)}</span>
        </div>
        <h2 className="mt-4 text-sm font-semibold">Before you publish</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed">
          {checks.map((item) => (
            <li key={item} className="border-t border-line pt-2">
              {item}
            </li>
          ))}
        </ul>
        <label className="mt-5 block">
          <span className="mb-1.5 block text-[10px] tracking-[0.1em] text-muted uppercase">Note</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={4}
            className="w-full border border-line px-3 py-2 text-sm"
          />
        </label>
        {error ? (
          <p className="mt-3 text-sm text-warn" role="alert">
            {error}
          </p>
        ) : null}
        {row.status === "rejected" ? (
          <p className="mt-3 text-sm text-warn">Yearly renewal is off for this listing.</p>
        ) : null}
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void review("approve")}
            className="rounded-[2px] bg-pine px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
          >
            Approve and publish
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void review("request_changes")}
            className="rounded-[2px] border border-ink px-4 py-3 text-sm disabled:opacity-70"
          >
            Request changes
          </button>
          <p className="text-xs leading-relaxed text-muted">
            Rejecting turns off the yearly renewal for this listing.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => void review("reject")}
            className="rounded-[2px] border border-line px-4 py-3 text-sm disabled:opacity-70"
          >
            Reject
          </button>
        </div>
        <div className="relative mt-4">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label="More actions"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-[2px] border border-line px-3 py-1.5 text-sm"
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute left-0 z-10 mt-1 w-40 border border-line bg-surface p-1 shadow-search">
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-stone" onClick={() => void waive()}>
                Waive fee
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
