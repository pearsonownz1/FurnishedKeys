import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ListingSetup } from "@/components/listing/listing-setup";
import { paidThroughMonthYear, parseCheckoutStatus } from "@/lib/checkout";
import { GET as readCheckoutStatus } from "@/app/api/listings/[id]/checkout/status/route";
import { loadListingEditor } from "@/lib/listing-editor-load";
import { stepFromQuery } from "@/lib/listing-draft";

type Search = Record<string, string | string[] | undefined>;

export default function SetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Setup params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Setup({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const loaded = await loadListingEditor(id);
  if (loaded.status === "error") {
    return (
      <div className="shell py-16">
        <h1 className="font-serif text-4xl font-normal">We couldn&apos;t load this draft.</h1>
        <p className="mt-4 text-sm text-muted">Please try again.</p>
      </div>
    );
  }
  if (loaded.status !== "ready") {
    return (
      <div className="shell py-16">
        <h1 className="font-serif text-4xl font-normal">Sign in to see this listing</h1>
        <Link href="/sign-in" className="mt-6 inline-block font-semibold text-pine">
          Sign in
        </Link>
      </div>
    );
  }

  const paidRaw = query.paid_through;
  const paidThrough = Array.isArray(paidRaw) ? paidRaw[0] : paidRaw;
  const sessionRaw = query.session_id;
  const sessionId = Array.isArray(sessionRaw) ? sessionRaw[0] : sessionRaw;
  const fromSession = sessionId ? await paidThroughForSession(id, sessionId) : null;
  const iso = fromSession || paidThrough || loaded.listing.paidThrough;
  const paidLabel =
    iso && !Number.isNaN(new Date(iso).getTime()) ? paidThroughMonthYear(iso) : null;
  const stepRaw = query.step;

  return (
    <ListingSetup
      listingId={id}
      initial={loaded.listing.draft}
      initialStep={stepFromQuery(Array.isArray(stepRaw) ? stepRaw[0] : stepRaw)}
      placeLabel={loaded.listing.placeLabel}
      paidThroughLabel={paidLabel}
    />
  );
}

async function paidThroughForSession(id: string, sessionId: string): Promise<string | null> {
  const response = await readCheckoutStatus(
    new Request(
      `http://localhost/api/listings/${id}/checkout/status?session_id=${encodeURIComponent(sessionId)}`,
    ),
    { params: Promise.resolve({ id }) },
  );
  if (!response.ok) return null;
  const parsed = parseCheckoutStatus(await response.json());
  return parsed?.paid_through ?? null;
}
