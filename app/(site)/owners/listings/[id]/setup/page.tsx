import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SetupReceipt } from "@/components/listing/setup-receipt";
import { loadListingEditor } from "@/lib/listing-editor-load";

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
  const raw = query.paid_through;
  const paidThrough = Array.isArray(raw) ? raw[0] : raw;
  const loaded = await loadListingEditor(id);
  if (!loaded) {
    return (
      <div className="shell py-16">
        <h1 className="font-serif text-4xl font-normal">Sign in to see this listing</h1>
        <Link href="/sign-in" className="mt-6 inline-block font-semibold text-pine">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="shell py-12 lg:py-16">
      <SetupReceipt listingId={id} title={loaded.title} initialPaidThrough={paidThrough ?? null} />
    </div>
  );
}
