import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AssessmentForm } from "@/components/owners/assessment-form";
import { sanitizeSource } from "@/lib/leads";
import { ownersKicker, ownersRegionName } from "@/lib/owners-copy";
import { FREE_TO_LIST, listMyPropertyLabel } from "@/lib/pricing";

export const metadata = {
  title: "List your property",
  description: FREE_TO_LIST,
};

type Search = Record<string, string | string[] | undefined>;

const selfPoints = [
  "Photos, monthly rent, and every fee (utilities, deposit, cleaning, pets) shown on its own line",
  "Inquiries come straight to you, and you approve every renter",
  "Show when your availability was last confirmed so renters trust the dates",
  "Manage several listings from one owner dashboard",
] as const;

const renterChips = [
  "Traveling professionals",
  "Relocating families",
  "Contract workers",
  "Between homes",
] as const;

const steps = [
  { n: "01", body: "Tell us about your place." },
  { n: "02", body: "We review and approve the listing before it goes live." },
  { n: "03", body: "Renters send inquiries, and you or we take it from there." },
] as const;

export default function OwnersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <OwnersLanding searchParams={searchParams} />
    </Suspense>
  );
}

async function OwnersLanding({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.src;
  const source = sanitizeSource(Array.isArray(raw) ? raw[0] : raw);
  const listLabel = listMyPropertyLabel();
  const startHref = source ? `/signup?src=${encodeURIComponent(source)}` : "/signup";
  const region = ownersRegionName();

  return (
    <div>
      <section className="grid bg-stone md:min-h-[620px] md:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-14 md:px-10 md:py-16 lg:pt-[110px] lg:pr-20 lg:pb-20 lg:pl-[120px]">
          <p className="text-xs tracking-[0.14em] text-muted uppercase">{ownersKicker()}</p>
          <h1 className="mt-4 max-w-[12ch] font-serif text-[clamp(2.75rem,8vw,5.25rem)] leading-[0.95] font-normal tracking-[-1px] md:text-[84px]">
            Your furnished space,{" "}
            <span className="text-pine italic">rented by the month.</span>
          </h1>
          <p className="mt-5 max-w-[36rem] text-[17px] leading-relaxed text-ink">
            List your ADU, apartment, room, or house for monthly stays in {region}, or have us
            handle it for you.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={startHref}
              className="rounded-[2px] bg-pine px-5 py-3.5 text-center text-[15px] font-semibold text-white"
            >
              {listLabel}
            </Link>
            <a
              href="#assessment"
              className="rounded-[2px] border border-ink px-5 py-3.5 text-center text-[15px]"
            >
              Get a free rental assessment
            </a>
          </div>
          <p className="mt-5 flex items-start gap-2 text-sm text-ok">
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ok" />
            We only publish a property after its owner submits and approves it.
          </p>
        </div>
        <div className="relative min-h-[260px]">
          <Image
            src="/demo/p1.jpg"
            alt="A dark modern ADU set among pines and rock"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      <section className="shell py-16 lg:py-24">
        <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.6px]">
          Two ways to work with us
        </h2>
        <div className="mt-8 grid gap-px bg-line md:grid-cols-2">
          <article className="bg-surface p-8 md:p-11">
            <p className="text-xs tracking-[0.14em] text-muted uppercase">List it yourself</p>
            <h3 className="mt-3 font-serif text-[clamp(1.75rem,3vw,2.25rem)] leading-none font-normal">
              Your listing, your renters
            </h3>
            <p className="mt-6 max-w-sm font-serif text-[clamp(1.75rem,3vw,2.25rem)] leading-tight text-pine">
              {FREE_TO_LIST}
            </p>
            <ul className="mt-8">
              {selfPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 border-t border-line py-3 text-[15px] leading-relaxed">
                  <span aria-hidden="true" className="mt-[0.7em] h-px w-2.5 shrink-0 bg-pine" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href={startHref}
              className="mt-8 inline-block rounded-[2px] bg-pine px-5 py-3.5 text-[15px] font-semibold text-white"
            >
              {listLabel}
            </Link>
          </article>
          <article className="bg-pine-d p-8 text-white md:p-11">
            <p className="text-xs tracking-[0.14em] text-[#b9c9bd] uppercase">
              Furnished Keys managed
            </p>
            <h3 className="mt-3 font-serif text-[clamp(1.75rem,3vw,2.25rem)] leading-none font-normal">
              We handle it for you
            </h3>
            <p className="mt-6 text-[22px] leading-snug text-[#c9d5cc]">
              Pricing set in your free assessment
            </p>
            <a
              href="#assessment"
              className="mt-8 inline-block rounded-[2px] bg-white px-5 py-3.5 text-[15px] font-semibold text-pine-d"
            >
              Get a free rental assessment
            </a>
          </article>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="shell grid gap-8 py-16 md:grid-cols-[420px_minmax(0,1fr)] md:py-20">
          <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.6px]">
            Who&apos;s renting
          </h2>
          <div>
            <p className="max-w-[40rem] text-[17px] leading-relaxed">
              Traveling professionals, families relocating to the area, contract workers, and
              people between homes who need a furnished place for a few months, without a
              year-long lease.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {renterChips.map((chip) => (
                <li key={chip} className="rounded-[2px] border border-line px-3 py-1.5 text-sm">
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="shell py-16 lg:py-20">
          <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.6px]">
            How it works
          </h2>
          <ol className="mt-2.5 grid list-none border-t border-ink md:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="pt-7 pr-6 md:pr-8">
                <p className="font-serif text-[44px] text-pine italic">{step.n}</p>
                <p className="mt-2 max-w-[28ch] text-[17px] leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="assessment" className="scroll-mt-6 bg-stone">
        <div className="grid items-start gap-10 px-5 py-12 md:grid-cols-2 md:gap-8 md:px-8 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-0 lg:px-0 lg:py-0">
          <div className="lg:my-12 lg:pr-8 lg:pl-[max(1.25rem,calc((100vw-1200px)/2))]">
            <p className="text-xs tracking-[0.14em] text-muted uppercase">Free, no obligation</p>
            <h2 className="mt-3 font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.6px]">
              Get a rental assessment
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">
              Tell us about the property and we&apos;ll follow up with what it could rent for and
              how we&apos;d work together.
            </p>
          </div>
          <AssessmentForm source={source} />
        </div>
      </section>
    </div>
  );
}
