import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { loadListingEditor } from "@/lib/listing-editor-load";
import { isListingStep } from "@/lib/listing-draft";
import { canonical } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return canonical(`/owners/listings/${id}`);
}

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
        <h1 className="font-serif text-4xl font-normal">Sign in to edit this listing</h1>
        <p className="mt-4 text-sm text-muted">This draft belongs to the account that started it.</p>
        <Link href="/sign-in" className="mt-6 inline-block font-semibold text-pine">
          Sign in
        </Link>
      </div>
    );
  }

  const raw = query.step;
  const step = Array.isArray(raw) ? raw[0] : raw;
  const suffix = isListingStep(step) ? `?step=${step}` : "";
  redirect(`/owners/listings/${id}/setup${suffix}`);
}
