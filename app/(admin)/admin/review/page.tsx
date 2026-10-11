import { connection } from "next/server";
import { Suspense } from "react";
import { ReviewDesk } from "@/components/admin/review-desk";
import { loadReviewQueue } from "@/lib/admin-load";
import { submittedLabel } from "@/lib/admin-present";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Review queue",
  description: "Approve, request changes, or reject a listing.",
  ...canonical("/admin/review"),
};

type Search = Record<string, string | string[] | undefined>;

export default function ReviewPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}

async function Screen({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const [queue, params] = await Promise.all([loadReviewQueue(), searchParams]);
  const raw = params.id;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const now = new Date();
  return (
    <ReviewDesk
      queue={queue.map((listing) => ({
        ...listing,
        submittedLabel: submittedLabel(listing.submitted_at, now),
      }))}
      requestedId={requested ?? null}
    />
  );
}
