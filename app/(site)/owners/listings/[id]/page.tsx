import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ListingWizard, stepFromQuery } from "@/components/listing/listing-wizard";
import { loadListingEditor } from "@/lib/listing-editor-load";
import { primaryLocation } from "@/lib/locations";

type Search = Record<string, string | string[] | undefined>;

export default function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Editor params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Editor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const raw = query.step;
  const loaded = await loadListingEditor(id);
  if (!loaded) {
    return (
      <div className="shell py-16">
        <h1 className="font-serif text-4xl font-normal">Sign in to edit this listing</h1>
        <p className="mt-4 text-sm text-muted">This draft belongs to the account that started it.</p>
        <Link href="/sign-in" className="mt-6 inline-block font-semibold text-pine">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <ListingWizard
      listingId={id}
      locationId={primaryLocation().id}
      initial={loaded.draft}
      initialStep={stepFromQuery(Array.isArray(raw) ? raw[0] : raw)}
    />
  );
}
