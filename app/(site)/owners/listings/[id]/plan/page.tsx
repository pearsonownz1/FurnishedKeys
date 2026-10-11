import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ownersRegionName } from "@/lib/owners-copy";
import { listingFeeAmount } from "@/lib/pricing";

const checks = [
  "Your listing on Furnished Keys for a full year",
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

  return (
    <div className="shell grid items-start gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-16">
      <div>
        <p className="text-xs tracking-[0.08em] text-muted">One plan, every listing</p>
        <h1 className="mt-3 max-w-[16ch] font-serif text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.95] font-normal tracking-[-0.8px]">
          Reach monthly renters in {ownersRegionName()}.
        </h1>
        <ul className="mt-8 max-w-xl">
          {checks.map((check) => (
            <li key={check} className="flex items-start gap-3 py-2.5 text-[15px]">
              <Check />
              <span>{check}</span>
            </li>
          ))}
        </ul>
      </div>
      <aside className="bg-pine px-6 py-8 text-white">
        <p className="font-serif text-6xl leading-none">
          {listingFeeAmount()}
          <span className="ml-2 font-sans text-lg tracking-normal text-white/80">/ year</span>
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/80">
          No commission and no booking fees…
        </p>
        <Link
          href={`/owners/listings/${id}/checkout`}
          className="mt-8 block w-full rounded-[2px] bg-white px-5 py-3 text-center text-sm font-semibold text-pine"
        >
          Get started
        </Link>
        <p className="mt-5 text-sm leading-relaxed text-white/85">
          Want us to manage it instead?{" "}
          <Link href="/owners#assessment" className="font-semibold underline">
            Get a free rental assessment
          </Link>
        </p>
      </aside>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 size-4 shrink-0 text-pine" aria-hidden="true">
      <path d="M2.5 8.5 6 12 13.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
