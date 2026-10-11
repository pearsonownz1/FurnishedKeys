import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ListingCard } from "@/components/listing-card";
import { SearchBar, SearchBarSkeleton } from "@/components/search-bar";
import { SiteFooter } from "@/components/site-footer";
import { AccountHeader } from "@/components/account-header";
import { brand } from "@/lib/brand";
import {
  filterListings,
  getPublicListings,
  primaryPhoto,
  sortByRecentConfirmation,
} from "@/lib/listings";
import { launchKicker, primaryLocation } from "@/lib/locations";
import { loadWhereLocations } from "@/lib/locations-load";
import { signedPhotoUrls } from "@/lib/photos";
import { FREE_TO_LIST } from "@/lib/pricing";

const steps = [
  {
    n: "01",
    title: "Search by dates",
    body: "Every listing shows the full monthly cost, with rent, utilities and deposit listed separately.",
  },
  {
    n: "02",
    title: "Send an inquiry",
    body: "Tell the owner your dates, who's coming and any pets. Replies come to your inbox.",
  },
  {
    n: "03",
    title: "Move in furnished",
    body: "Agree on terms with the owner or manager and arrive to a ready home.",
  },
] as const;

export function HomePage() {
  const market = primaryLocation();

  return (
    <>
      <main id="content">
        <section className="relative">
          <div className="relative min-h-[560px] text-white lg:h-[720px]">
            <Image
              src="/demo/hero.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[center_45%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,24,20,0.78)_0%,rgba(18,24,20,0.46)_46%,rgba(18,24,20,0.12)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,24,20,0.38)_0%,transparent_28%)]" />
            <Suspense fallback={null}>
              <AccountHeader tone="overlay" />
            </Suspense>
            <div className="shell relative z-10 flex h-full flex-col justify-end pt-28 pb-24 lg:justify-start lg:pt-[168px] lg:pb-0">
              <p className="fk-rise text-xs tracking-[0.14em] uppercase">
                {launchKicker(market)}
              </p>
              <h1 className="fk-rise mt-[18px] font-serif text-[clamp(3.25rem,6.4vw,5.75rem)] leading-[0.98] font-normal tracking-[-1.5px] [animation-delay:60ms]">
                {brand.headline[0]}
                <br />
                <em className="italic">{brand.headline[1]}</em>
              </h1>
              <p className="fk-rise mt-[18px] max-w-[520px] text-[17px] leading-normal sm:text-[19px] [animation-delay:120ms]">
                {brand.subline}
              </p>
            </div>
          </div>
          <div className="shell relative z-20 -mt-10 lg:-mt-12">
            <div className="fk-rise [animation-delay:160ms]">
              <Suspense fallback={<SearchBarSkeleton />}>
                <SearchBar />
              </Suspense>
            </div>
          </div>
        </section>

        <section className="shell mt-14 lg:mt-[4.75rem]" aria-label="Choose a path">
          <div className="grid border border-line bg-line sm:grid-cols-2 sm:gap-px">
            <Link
              href="/rentals"
              className="flex flex-col justify-between gap-8 bg-surface px-7 py-9 sm:px-11 sm:py-10 lg:flex-row lg:items-end"
            >
              <div>
                <h2 className="font-serif text-[2rem] font-normal tracking-[-0.5px] sm:text-[2.5rem]">
                  Find a home
                </h2>
                <p className="mt-2 max-w-[360px] text-[15px] leading-relaxed text-muted">
                  Furnished ADUs, apartments, rooms and houses for monthly and
                  extended stays.
                </p>
              </div>
              <span className="w-fit border-b border-pine pb-0.5 text-sm font-semibold whitespace-nowrap text-pine">
                Browse rentals
              </span>
            </Link>
            <Link
              href="/owners"
              className="flex flex-col justify-between gap-8 bg-surface px-7 py-9 sm:px-11 sm:py-10 lg:flex-row lg:items-end"
            >
              <div>
                <h2 className="font-serif text-[2rem] font-normal tracking-[-0.5px] sm:text-[2.5rem]">
                  List your property
                </h2>
                <p className="mt-2 max-w-[360px] text-[15px] leading-relaxed text-muted">
                  Reach renters looking for a few months, not a few nights.
                  Manage it yourself or with us.
                </p>
              </div>
              <span className="w-fit border-b border-pine pb-0.5 text-sm font-semibold whitespace-nowrap text-pine">
                Start a listing
              </span>
            </Link>
          </div>
        </section>

        <section className="shell pt-20 lg:pt-28">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.8px]">
              Available in {market.name}
            </h2>
            <Link href="/rentals?view=map" className="text-sm font-semibold text-pine">
              See all on the map
            </Link>
          </div>
          <Suspense fallback={<p className="text-muted">Loading homes…</p>}>
            <AvailableHomes />
          </Suspense>
        </section>

        <section className="shell pt-20 lg:pt-28">
          <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.8px]">
            How monthly stays work
          </h2>
          <ol className="mt-2.5 grid list-none border-t border-ink lg:grid-cols-3">
            {steps.map((step) => (
              <li key={step.n} className="pt-7 pr-6 lg:pr-8">
                <p className="font-serif text-[2.75rem] text-pine italic">{step.n}</p>
                <h3 className="mt-1.5 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 max-w-[320px] text-[15px] leading-relaxed text-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 grid bg-pine-d text-white lg:mt-28 lg:grid-cols-2">
          <div className="owner-copy">
            <p className="text-xs tracking-[0.14em] text-[#b9c9bd] uppercase">
              For owners
            </p>
            <h2 className="mt-4 font-serif text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.05] font-normal tracking-[-0.8px]">
              Your ADU,
              <br />
              rented by the month.
            </h2>
            <p className="mt-4 max-w-[460px] text-[17px] leading-[1.55] text-[#c9d5cc]">
              List it yourself and handle renters directly, or ask us about full
              management.
            </p>
            <div className="mt-8 grid max-w-[480px] gap-px border border-white/15 bg-white/15">
              <div className="flex items-center justify-between gap-4 bg-pine-d px-5 py-[18px]">
                <div>
                  <p className="font-semibold">List it yourself</p>
                  <p className="mt-0.5 text-[13px] text-[#b9c9bd]">
                    Your listing, messages and calendar
                  </p>
                </div>
                <p className="max-w-[14rem] text-right font-serif text-lg leading-snug">
                  {FREE_TO_LIST}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 bg-pine-d px-5 py-[18px]">
                <div>
                  <p className="font-semibold">Furnished Keys management</p>
                  <p className="mt-0.5 text-[13px] text-[#b9c9bd]">
                    Pricing set in your free assessment
                  </p>
                </div>
                <Link href="/owners#assessment" className="text-sm text-[#c9d5cc]">
                  Book a consultation
                </Link>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/owners"
                className="rounded-[2px] bg-white px-5 py-3.5 text-center text-[15px] font-semibold text-pine-d"
              >
                List your property
              </Link>
              <Link
                href="/owners#assessment"
                className="rounded-[2px] border border-white/60 px-5 py-3.5 text-center text-[15px]"
              >
                Talk to us about management
              </Link>
            </div>
          </div>
          <div className="relative min-h-[260px] lg:min-h-full">
            <Image
              src="/demo/p1.jpg"
              alt="A dark modern ADU set among pines and rock"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

async function AvailableHomes() {
  await connection();
  const market = primaryLocation();
  const directory = await loadWhereLocations();
  const listings = sortByRecentConfirmation(
    filterListings(await getPublicListings(), { where: market.slug }, directory),
  ).slice(0, 3);
  const photos = await signedPhotoUrls(listings);

  return (
    <div className="grid gap-7 lg:grid-cols-3">
      {listings.map((listing) => {
        const photo = primaryPhoto(listing);
        return (
          <ListingCard
            key={listing.id}
            listing={listing}
            imageUrl={photo ? (photos.get(photo.storage_path) ?? null) : null}
          />
        );
      })}
    </div>
  );
}
