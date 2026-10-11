import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ListingSetup } from "@/components/listing/listing-setup";
import { loadListingEditor } from "@/lib/listing-editor-load";
import { stepFromQuery } from "@/lib/listing-draft";
import { canonical } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return canonical(`/owners/listings/${id}/setup`);
}

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

  const stepRaw = query.step;

  return (
    <ListingSetup
      listingId={id}
      initial={loaded.listing.draft}
      initialStep={stepFromQuery(Array.isArray(stepRaw) ? stepRaw[0] : stepRaw)}
      placeLabel={loaded.listing.placeLabel}
    />
  );
}
