import Link from "next/link";
import { Suspense } from "react";
import { ListingCard } from "@/components/listing-card";
import { filterListings, getPublicListings } from "@/lib/listings";
import { locationBySlug, primaryLocation } from "@/lib/locations";
import { formatMonthDay, parseListingQuery } from "@/lib/search";

type Search = Record<string, string | string[] | undefined>;

export const metadata = {
  title: "Find a home",
  description: "Furnished homes for monthly and extended stays.",
};

export default function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<p className="shell py-16 text-muted">Loading homes…</p>}>
      <RentalsResults searchParams={searchParams} />
    </Suspense>
  );
}

async function RentalsResults({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const query = parseListingQuery(await searchParams);
  const place = (query.where && locationBySlug(query.where)) || primaryLocation();
  const listings = filterListings(getPublicListings(), query);
  const summary = describeQuery(query, place.name);

  return (
    <div className="shell py-12 lg:py-16">
      <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
        Homes in {place.name}
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{summary}</p>
      {query.view === "map" ? (
        <p className="mt-6 max-w-xl border border-line bg-surface px-4 py-3 text-sm text-ink">
          The map opens with a later release. Matching homes are listed below.
        </p>
      ) : null}
      {listings.length === 0 ? (
        <p className="mt-12 text-ink">
          No homes match that search yet.{" "}
          <Link href="/rentals" className="font-semibold text-pine">
            Clear filters
          </Link>
        </p>
      ) : (
        <div className="mt-10 grid gap-7 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

function describeQuery(
  query: ReturnType<typeof parseListingQuery>,
  placeName: string,
): string {
  const bits = [`Showing furnished homes around ${placeName}`];
  if (query.moveIn) bits.push(`moving in ${formatMonthDay(query.moveIn)}`);
  if (query.stayMonths) {
    bits.push(
      `for ${query.stayMonths} ${query.stayMonths === 1 ? "month" : "months"}`,
    );
  }
  return `${bits.join(", ")}. Rent, utilities, and deposits are listed separately.`;
}
