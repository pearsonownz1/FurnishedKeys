import { connection } from "next/server";
import { Suspense } from "react";
import { BrowseBoard } from "@/components/browse/browse-board";
import type { BrowseItem } from "@/components/browse/listing-row";
import { FilterBar } from "@/components/browse/filter-bar";
import {
  browseMeta,
  confirmationLabel,
  filterListings,
  formatBrowseFee,
  getPublicListings,
  latestConfirmedAt,
  minStayTag,
  orderedFees,
  petTag,
  primaryPhoto,
  sortByRecentConfirmation,
} from "@/lib/listings";
import { locationBySlug } from "@/lib/locations";
import { formatCents } from "@/lib/money";
import { signedPhotoUrls } from "@/lib/photos";
import { moveInOptions, parseListingQuery, type BrowseView } from "@/lib/search";

type Search = Record<string, string | string[] | undefined>;

export const metadata = {
  title: "Furnished rentals",
  description: "Furnished homes for monthly and extended stays.",
};

export default function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted md:px-8">Loading homes…</p>}>
      <RentalsResults searchParams={searchParams} />
    </Suspense>
  );
}

async function RentalsResults({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  await connection();
  const query = parseListingQuery(await searchParams);
  const view: BrowseView = query.view ?? "split";
  let catalogError = false;
  let items: BrowseItem[] = [];

  try {
    const listings = sortByRecentConfirmation(
      filterListings(await getPublicListings(), query),
    );
    const photos = await signedPhotoUrls(listings);
    items = listings.map((listing) => {
      const photo = primaryPhoto(listing);
      const confirmed = latestConfirmedAt(listing.availability_windows);
      return {
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        meta: browseMeta(listing),
        rent: formatCents(listing.monthly_rent_cents),
        fees: orderedFees(listing.fees).map(formatBrowseFee),
        tags: [minStayTag(listing.min_stay_months), petTag(listing)],
        confirmed: confirmed ? confirmationLabel(confirmed) : null,
        imageUrl: photo ? (photos.get(photo.storage_path) ?? null) : null,
        imageAlt: photo?.caption ?? listing.title,
        isDemo: listing.is_demo,
        lat: listing.approx_lat,
        lng: listing.approx_lng,
        priceLabel: formatCents(listing.monthly_rent_cents),
      };
    });
  } catch {
    catalogError = true;
  }

  const place = query.where ? locationBySlug(query.where) : undefined;
  const title = place ? `Furnished rentals in ${place.name}` : "Furnished rentals";
  const noun = items.length === 1 ? "listing" : "listings";
  const demoNoun = items.length === 1 ? "demo listing" : "demo listings";
  const allDemo = items.length > 0 && items.every((item) => item.isDemo);
  const summary = catalogError
    ? "Catalog unavailable"
    : `${items.length} ${allDemo ? demoNoun : noun} · Sorted by recently confirmed`;

  return (
    <div>
      <FilterBar key={summary + view + (query.where ?? "")} query={query} moveIns={moveInOptions(new Date())} />
      <BrowseBoard
        items={items}
        title={title}
        summary={summary}
        view={view}
        catalogError={catalogError}
      />
    </div>
  );
}
