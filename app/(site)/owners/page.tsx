import { connection } from "next/server";
import { Suspense } from "react";
import { LeadForm } from "@/components/owners/lead-form";
import { sanitizeSource } from "@/lib/leads";

export const metadata = {
  title: "Owner assessment",
  description:
    "Tell Furnished Keys about a home you might list. We'll reply by email. You won't be charged.",
};

type Search = Record<string, string | string[] | undefined>;

export default function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<p className="shell py-16 text-muted">Loading…</p>}>
      <OwnersBody searchParams={searchParams} />
    </Suspense>
  );
}

async function OwnersBody({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.src;
  const source = sanitizeSource(Array.isArray(raw) ? raw[0] : raw);

  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">For owners</p>
      <h1 className="mt-4 font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-[1.05] font-normal tracking-[-0.8px]">
        Tell us about the home
      </h1>
      <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
        A short assessment is enough to start. Share how you&apos;d like to list,
        and we&apos;ll reply by email.
      </p>
      <div className="mt-10">
        <LeadForm source={source} />
      </div>
    </div>
  );
}
