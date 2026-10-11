import { connection } from "next/server";
import { Suspense } from "react";
import { BrowseBoard } from "@/components/browse/browse-board";
import type { BrowseItem } from "@/components/browse/listing-row";
import { FilterBar } from "@/components/browse/filter-bar";
import { SearchBar } from "@/components/search-bar";
import {
  allInLine,
  bedsAndSleeps,
  filterListings,
  getPublicListings,
  latestConfirmedAt,
  minimumStayLabel,
  primaryPhoto,
  propertyTypeLabel,
  sortByRecentConfirmation,
} from "@/lib/listings";
import { loadWhereLocations } from "@/lib/locations-load";
import { formatCents } from "@/lib/money";
import { signedPhotoUrls } from "@/lib/photos";
import { canonical } from "@/lib/site";
import { parseListingQuery, stayLinkQuery, type BrowseView } from "@/lib/search";

type Search = Record<string, string | string[] | undefined>;

export const metadata = {
  title: "Furnished rentals",
  description: "Furnished homes for monthly and extended stays.",
  ...canonical("/rentals"),
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
  const view: BrowseView = query.view ?? "list";
  let catalogError = false;
  let items: BrowseItem[] = [];

  const places = await loadWhereLocations();

  try {
    const listings = sortByRecentConfirmation(
      filterListings(await getPublicListings(), query, places),
    );
    const photos = await signedPhotoUrls(listings);
    items = listings.map((listing) => {
      const photo = primaryPhoto(listing);
      const confirmed = latestConfirmedAt(listing.availability_windows);
      return {
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        typeLabel: propertyTypeLabel(listing.property_type),
        bedsLine: bedsAndSleeps(listing),
        rent: formatCents(listing.monthly_rent_cents),
        allIn: allInLine(listing),
        minimumStay: minimumStayLabel(listing.min_stay_months),
        confirmed: Boolean(confirmed),
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

  const place = query.where ? places.find((item) => item.slug === query.where) : undefined;
  const title = place ? `Furnished rentals in ${place.name}` : "Furnished rentals";
  const noun = items.length === 1 ? "listing" : "listings";
  const demoNoun = items.length === 1 ? "demo listing" : "demo listings";
  const allDemo = items.length > 0 && items.every((item) => item.isDemo);
  const summary = catalogError
    ? "Catalog unavailable"
    : `${items.length} ${allDemo ? demoNoun : noun} · Sorted by recently confirmed`;

  const staySearch = stayLinkQuery(query);
  const searchKey = [
    query.where ?? "",
    query.moveIn ?? "",
    query.moveOut ?? "",
    query.flexible ? "1" : "",
    query.budgetCents ?? "",
  ].join(":");

  return (
    <div className="lg:flex lg:h-[calc(100dvh-4rem)] lg:flex-col">
      <div className="border-b border-line bg-bg px-5 py-4 md:px-8">
        <SearchBar key={searchKey} initial={query} places={places} />
      </div>
      <FilterBar key={summary + view + searchKey} query={query} places={places} />
      <div className="lg:min-h-0 lg:flex-1">
        <BrowseBoard
          items={items}
          title={title}
          summary={summary}
          view={view}
          catalogError={catalogError}
          staySearch={staySearch}
          placeCenter={
            place && place.lat !== null && place.lng !== null
              ? { lat: place.lat, lng: place.lng }
              : null
          }
        />
      </div>
    </div>
  );
}
