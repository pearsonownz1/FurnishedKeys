import { connection } from "next/server";
import { Suspense } from "react";
import { ReviewDesk } from "@/components/admin/review-desk";
import { submittedLabel } from "@/lib/admin-console";
import { loadAdminConsole } from "@/lib/admin-console-load";
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
  const gate = await loadAdminConsole();
  if (gate.kind !== "ready") return null;
  const params = await searchParams;
  const raw = params.id;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const now = new Date();
  const queue = gate.data.queue.map((listing) => ({
    ...listing,
    submittedLabel: submittedLabel(listing.submittedAt, now),
  }));
  const known = requested ? queue.some((listing) => listing.id === requested) : false;
  return (
    <ReviewDesk
      queue={queue}
      selectedId={known ? (requested ?? null) : null}
      missingRequested={Boolean(requested) && !known}
    />
  );
}
