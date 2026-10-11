import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/property/gallery";
import { InquiryCard } from "@/components/property/inquiry-card";
import { PropertyMap } from "@/components/property/property-map";
import {
  bathLabel,
  bedLabel,
  confirmedDay,
  costTableFees,
  feeAmountLabel,
  getListingBySlug,
  getPublicListings,
  managementLabel,
  minimumStayLabel,
  monthlyTotalCents,
  petTag,
  primaryWindow,
  propertyTypeLabel,
  sortedPhotos,
} from "@/lib/listings";
import { locationShort } from "@/lib/locations";
import { formatCents } from "@/lib/money";
import { signedPhotoUrls } from "@/lib/photos";
import { addMonths, formatMonthDay, parseListingQuery } from "@/lib/search";

export async function generateStaticParams() {
  try {
    const listings = await getPublicListings();
    return listings.map((listing) => ({ slug: listing.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "Home" };
  return {
    title: listing.title,
    description: listing.description ?? undefined,
  };
}

export default function ListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading home…</p>}>
      <ListingBody params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ListingBody({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const query = parseListingQuery(await searchParams);
  const photos = sortedPhotos(listing);
  const signed = await signedPhotoUrls([listing]);
  const window = primaryWindow(listing.availability_windows);
  const confirmed = window?.last_confirmed_at;
  const moveIn =
    query.moveIn && window && query.moveIn >= window.available_from
      ? query.moveIn
      : (window?.available_from ?? "");
  const stay =
    query.stayMonths && query.stayMonths >= listing.min_stay_months
      ? query.stayMonths
      : listing.min_stay_months;
  const moveOut = moveIn ? addMonths(moveIn, stay) : "";
  const facts = [
    propertyTypeLabel(listing.property_type),
    bedLabel(listing.bedrooms),
    bathLabel(listing.bathrooms),
    `Sleeps ${listing.max_occupants}`,
    petTag(listing),
    managementLabel(listing.management),
  ];
  const point =
    listing.approx_lat !== null && listing.approx_lng !== null
      ? {
          id: listing.id,
          slug: listing.slug,
          lat: listing.approx_lat,
          lng: listing.approx_lng,
          priceLabel: formatCents(listing.monthly_rent_cents),
        }
      : null;

  const availabilityLine = [
    window ? `Available ${formatMonthDay(window.available_from)}` : null,
    confirmed ? `confirmed ${confirmedDay(confirmed)}` : null,
    minimumStayLabel(listing.min_stay_months),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="px-5 py-7 md:px-8 lg:px-16">
      <p className="mb-4 text-[13px] text-muted">
        <Link href="/rentals" className="hover:text-ink">
          {locationShort(listing.location)}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{propertyTypeLabel(listing.property_type)}</span>
        <span aria-hidden="true"> / </span>
        <span>{listing.title}</span>
        {listing.is_demo ? (
          <span className="font-semibold text-clay"> · Demo listing</span>
        ) : null}
      </p>
      <Gallery
        photos={photos.map((photo) => ({
          src: signed.get(photo.storage_path) ?? null,
          alt: photo.caption ?? listing.title,
        }))}
      />
      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
        <div>
          <h1 className="font-serif text-[clamp(2.25rem,4vw,3rem)] leading-[1.05] font-normal tracking-[-0.6px]">
            {listing.title}
          </h1>
          <ul className="mt-3.5 mb-5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            {facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
          {listing.description ? (
            <p className="max-w-[620px] text-base leading-relaxed text-ink">
              {listing.description}
            </p>
          ) : null}

          <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
            Monthly cost
          </h2>
          <div className="border-t border-ink">
            <div className="flex justify-between gap-4 border-b border-line py-3 text-[15px]">
              <span className="text-muted">Rent</span>
              <span>{formatCents(listing.monthly_rent_cents)} / month</span>
            </div>
            {costTableFees(listing.fees).map((fee) => (
              <div
                key={fee.id}
                className="flex justify-between gap-4 border-b border-line py-3 text-[15px]"
              >
                <span className="text-muted">{fee.label}</span>
                <span>{feeAmountLabel(fee)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-3 text-[15px] font-semibold">
              <span>Total each month</span>
              <span>{formatCents(monthlyTotalCents(listing))}</span>
            </div>
          </div>

          {listing.amenities.length > 0 ? (
            <>
              <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
                Amenities
              </h2>
              <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {listing.amenities.map((amenity) => (
                  <li key={amenity} className="text-sm">
                    <span className="text-pine" aria-hidden="true">
                      —{" "}
                    </span>
                    {amenity}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {listing.house_rules ? (
            <>
              <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
                House rules
              </h2>
              <p className="max-w-[620px] text-[15px] leading-relaxed text-ink">
                {listing.house_rules}
              </p>
            </>
          ) : null}

          <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
            Approximate location
          </h2>
          {point ? (
            <PropertyMap point={point} center={{ lat: point.lat, lng: point.lng }} />
          ) : (
            <p className="text-sm text-muted">An approximate area is not on file yet.</p>
          )}
          <p className="mt-2 text-xs text-muted">
            Approximate area. The exact address is shared after the owner accepts.
          </p>
        </div>
        <InquiryCard
          listingId={listing.id}
          rentLabel={formatCents(listing.monthly_rent_cents)}
          availabilityLine={availabilityLine}
          defaults={{ moveIn, moveOut, occupants: 1 }}
          constraints={{
            minStayMonths: listing.min_stay_months,
            maxOccupants: listing.max_occupants,
            petsAllowed: listing.pets_allowed,
            availability: listing.availability_windows,
          }}
        />
      </div>
    </article>
  );
}
