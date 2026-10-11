import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { loadReviewQueue } from "@/lib/admin-queue";
import { queueFeeLabel, statusLabel } from "@/lib/owner-board";

export const metadata = {
  title: "Review queue",
  description: "Approve, request changes, or reject a listing.",
};

export default function AdminQueuePage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Queue />
    </Suspense>
  );
}

async function Queue() {
  await connection();
  const queue = await loadReviewQueue();

  return (
    <div className="shell py-12 lg:py-16">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">Admin</p>
      <h1 className="mt-3 font-serif text-[clamp(2.75rem,5vw,4.5rem)] leading-none font-normal tracking-[-1px]">
        Review queue
      </h1>
      {!queue.signedIn ? redirect("/sign-in?next=%2Fadmin%2Flistings") : null}
      {!queue.admin ? (
        <p className="mt-6 text-sm">Not authorized</p>
      ) : queue.rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">Nothing is waiting for review.</p>
      ) : (
        <ul className="mt-8 border border-line bg-surface">
          {queue.rows.map((listing) => (
            <li key={listing.id} className="border-b border-line last:border-b-0">
              <Link
                href={`/admin/listings/${listing.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"
              >
                <span>
                  <span className="font-semibold">{listing.title}</span>
                  <span className="mt-1 block text-sm text-muted">{statusLabel(listing.status)}</span>
                </span>
                <span className="text-sm">{queueFeeLabel(listing.feeStatus)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
