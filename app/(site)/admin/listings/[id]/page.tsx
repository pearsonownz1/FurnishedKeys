import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ReviewDetail } from "@/components/admin/review-detail";
import { loadReviewDetail } from "@/lib/admin-queue";

export default function AdminListingPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const result = await loadReviewDetail(id);
  if (result.status === "signed-out") {
    redirect(`/sign-in?next=${encodeURIComponent(`/admin/listings/${id}`)}`);
  }
  if (result.status === "forbidden") {
    return (
      <div className="shell py-16">
        <p className="text-sm">Not authorized</p>
      </div>
    );
  }
  if (result.status === "missing") {
    return (
      <div className="shell py-16">
        <h1 className="font-serif text-4xl font-normal">This listing is not in the queue</h1>
        <Link href="/admin/listings" className="mt-6 inline-block font-semibold text-pine">
          Back to the queue
        </Link>
      </div>
    );
  }

  return (
    <div className="shell py-12 lg:py-16">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">Admin</p>
      <h1 className="mt-3 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-none font-normal tracking-[-0.8px]">
        {result.listing.title}
      </h1>
      <div className="mt-8">
        <ReviewDetail listing={result.listing} />
      </div>
    </div>
  );
}
