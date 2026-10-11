import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadListingEditor } from "@/lib/listing-editor-load";
import { listingFeeAmount, listingFeePerYear } from "@/lib/pricing";

const checks = [
  "Photos, rent, and every fee on its own line",
  "Inquiries come straight to you",
  "You approve every renter",
  "Renters see when you last confirmed availability",
  "Several listings, one owner dashboard",
] as const;

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Plan params={params} />
    </Suspense>
  );
}

async function Plan({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const loaded = await loadListingEditor(id);
  const title = loaded.status === "ready" ? loaded.listing.title.trim() || "Your listing" : "Your listing";

  return (
    <div className="shell grid items-start gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
      <div>
        <p className="text-xs tracking-[0.14em] text-muted uppercase">List it yourself</p>
        <h1 className="mt-3 max-w-[14ch] font-serif text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.95] font-normal tracking-[-0.8px]">
          {listingFeeAmount()} a year
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{title}</p>
        <ul className="mt-8 max-w-xl">
          {checks.map((check) => (
            <li key={check} className="flex items-start gap-3 border-t border-line py-3 text-[15px]">
              <span aria-hidden="true" className="mt-[0.7em] h-px w-2.5 shrink-0 bg-pine" />
              <span>{check}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <aside className="bg-pine px-6 py-8 text-white">
          <p className="text-xs tracking-[0.14em] text-white/70 uppercase">Yearly listing fee</p>
          <p className="mt-4 font-serif text-5xl leading-none">{listingFeePerYear()}</p>
          <p className="mt-2 text-sm text-white/75">per listing</p>
          <Link
            href={`/owners/listings/${id}/checkout`}
            className="mt-8 inline-block rounded-[2px] bg-white px-5 py-3 text-sm font-semibold text-pine"
          >
            Get started
          </Link>
        </aside>
        <p className="mt-4 text-sm text-muted">
          Want us to manage it instead?{" "}
          <Link href="/owners#assessment" className="font-semibold text-ink underline">
            Get a free rental assessment
          </Link>
        </p>
      </div>
    </div>
  );
}
