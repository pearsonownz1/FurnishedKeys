import { connection } from "next/server";
import { Suspense } from "react";
import { ListingWizard } from "@/components/listing/listing-wizard";
import { emptyDraft, stepFromQuery } from "@/lib/listing-draft";
import { primaryLocation } from "@/lib/locations";

export const metadata = {
  title: "List your property",
  description: "Create a furnished listing. The fee is billed yearly.",
};

type Search = Record<string, string | string[] | undefined>;

export default function ListPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <NewListing searchParams={searchParams} />
    </Suspense>
  );
}

async function NewListing({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.step;
  const location = primaryLocation();

  return (
    <ListingWizard
      listingId={null}
      locationId={location.id}
      initial={emptyDraft()}
      initialStep={stepFromQuery(Array.isArray(raw) ? raw[0] : raw)}
    />
  );
}
