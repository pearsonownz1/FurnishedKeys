"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { approveListing, rejectListing, requestChanges } from "@/app/(site)/admin/actions";
import { CoverImage } from "@/components/cover-image";
import type { ReviewQueueRow } from "@/lib/admin-load";
import { formatCents } from "@/lib/money";
import { measure, shortName } from "@/lib/admin-present";
import type { AdminState } from "@/lib/admin-review";

const idle: AdminState = { ok: true };

export function ReviewDesk({
  queue,
  requestedId,
}: {
  queue: Array<ReviewQueueRow & { submittedLabel: string }>;
  requestedId: string | null;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(requestedId);
  const visible = queue.filter((row) => !hidden.includes(row.id));
  const selected = visible.find((row) => row.id === selectedId) ?? visible[0] ?? null;
  const missing = Boolean(requestedId) && !queue.some((row) => row.id === requestedId);

  function remove(id: string) {
    const index = visible.findIndex((row) => row.id === id);
    const next = visible[index + 1] ?? visible[index - 1] ?? null;
    setHidden((current) => (current.includes(id) ? current : [...current, id]));
    setSelectedId(next?.id ?? null);
    router.replace(next ? `/admin/review?id=${next.id}` : "/admin/review");
    router.refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-20 md:overflow-hidden md:pb-0">
      <div className="flex min-h-0 flex-1 flex-col bg-white md:flex-row">
        <aside className="w-full shrink-0 border-b border-line md:w-80 md:overflow-y-auto md:border-r md:border-b-0">
          <h1 className="border-b border-line px-4 py-3.5 text-sm font-semibold">
            Waiting for review · {visible.length}
          </h1>
          {visible.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-muted">Nothing is waiting for review.</p>
          ) : (
            <ul>
              {visible.map((listing) => {
                const on = listing.id === selected?.id;
                return (
                  <li key={listing.id} className="border-b border-line">
                    <Link
                      href={`/admin/review?id=${listing.id}`}
                      aria-current={on ? "true" : undefined}
                      onClick={() => setSelectedId(listing.id)}
                      className={
                        on
                          ? "flex items-center gap-3 bg-bg px-4 py-3 shadow-[inset_3px_0_0_var(--pine)]"
                          : "flex items-center gap-3 px-4 py-3"
                      }
                    >
                      <span className="relative h-[52px] w-[72px] shrink-0 bg-stone">
                        <CoverImage src={listing.cover_url} alt="" sizes="72px" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{listing.title?.trim() || "Untitled listing"}</span>
                        <span className="mt-0.5 block text-[13px] text-muted">
                          {shortName(listing.owner_name)}
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
          {missing ? (
            <p className="border-b border-line px-6 py-3 text-[13px] text-muted">
              That listing is not waiting for review.
            </p>
          ) : null}
          {selected ? <Preview key={selected.id} listing={selected} onDone={remove} /> : null}
        </div>
      </div>
    </div>
  );
}

function Preview({
  listing,
  onDone,
}: {
  listing: ReviewQueueRow & { submittedLabel: string };
  onDone: (id: string) => void;
}) {
  const [note, setNote] = useState("");
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approving, startApprove] = useTransition();
  const [changeState, submitChanges, changePending] = useActionState(async (previous: AdminState, formData: FormData) => {
    const result = await requestChanges(previous, formData);
    if (result.success) onDone(listing.id);
    return result;
  }, idle);
  const [rejectState, submitReject, rejectPending] = useActionState(async (previous: AdminState, formData: FormData) => {
    const result = await rejectListing(previous, formData);
    if (result.success) onDone(listing.id);
    return result;
  }, idle);
  const pending = approving || changePending || rejectPending;
  const formError =
    approveError ||
    (changeState.ok ? null : changeState.formError) ||
    (rejectState.ok ? null : rejectState.formError);

  function payload(): FormData {
    const formData = new FormData();
    formData.set("listingId", listing.id);
    formData.set("note", note);
    return formData;
  }

  return (
    <>
      <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="relative h-[250px] bg-stone">
          <CoverImage src={listing.cover_url} alt={listing.title?.trim() || "Listing cover"} sizes="80vw" priority />
        </div>
        <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_250px]">
          <div>
            <span className="inline-block bg-stone px-2 py-0.5 text-xs font-semibold">In review</span>
            <h2 className="mt-3 font-serif text-[32px] leading-none font-normal">
              {listing.title?.trim() || "Untitled listing"}
            </h2>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
              <p>
                <span className="font-serif text-lg text-ink">
                  {listing.rent == null ? "Rent not set" : formatCents(listing.rent)}
                </span>
                {listing.rent == null ? null : " / month"}
              </p>
              <p>
                {measure(listing.beds)} bd · {measure(listing.baths)} ba · {measure(listing.sqft)} sq ft
              </p>
              <p>Owner: {listing.owner_name?.trim() || "Owner"}</p>
            </div>
            {listing.owner_email ? <p className="mt-1 text-[13px] text-muted">{listing.owner_email}</p> : null}
            <p className="mt-2 text-[13px] text-muted">{listing.submittedLabel}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold">Listing check</h3>
            <ul className="mt-3 grid gap-2 text-[13px]">
              {listing.checklist.map((check) => (
                <li key={check.key} className="flex gap-2">
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
          maxLength={4000}
          className="min-w-0 flex-1 border border-line px-3 py-2.5 text-[13px]"
        />
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={pending}
            onClick={() => submitReject(payload())}
            className="border border-[#e6cbbd] bg-white px-4 py-2.5 text-[13px] font-semibold text-clay disabled:opacity-70"
          >
            {rejectPending ? "Saving…" : "Reject"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => submitChanges(payload())}
            className="border border-line bg-white px-4 py-2.5 text-[13px] font-semibold disabled:opacity-70"
          >
            {changePending ? "Saving…" : "Request changes"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setApproveError(null);
              startApprove(async () => {
                const result = await approveListing(listing.id);
                if (!result.ok) {
                  setApproveError(result.formError ?? "We couldn't update this listing. Please try again.");
                  return;
                }
                onDone(listing.id);
              });
            }}
            className="border border-pine bg-pine px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            {approving ? "Saving…" : "Approve and publish"}
          </button>
        </div>
      </div>
      {formError ? (
        <p className="px-6 pb-4 text-sm text-warn" role="alert">
          {formError}
        </p>
      ) : null}
    </>
  );
}
