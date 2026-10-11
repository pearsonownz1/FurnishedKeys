import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StayCalendar } from "@/components/listing/stay-calendar";
import { Gallery } from "@/components/property/gallery";
import { InquiryCard } from "@/components/property/inquiry-card";
import { PropertyMap } from "@/components/property/property-map";
import { TrustStrip } from "@/components/property/trust-strip";
import { expandRanges } from "@/lib/calendar-ranges";
import {
  costTableFees,
  feeAmountLabel,
  getListingBySlug,
  getPublicLandlord,
  getPublicListings,
  monthlyTotalCents,
  petTag,
  primaryWindow,
  sortedPhotos,
} from "@/lib/listings";
import { locationShort } from "@/lib/locations";
import { formatCents } from "@/lib/money";
import {
  goodForTags,
  groupedAmenities,
  propertyFactLine,
  propertyTypeName,
  trustCells,
} from "@/lib/property-display";
import { signedPhotoUrls } from "@/lib/photos";
import { addMonths, parseListingQuery } from "@/lib/search";

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
  const landlord = await getPublicLandlord(listing.id);
  const window = primaryWindow(listing.availability_windows);
  const moveIn =
    query.moveIn && window && query.moveIn >= window.available_from
      ? query.moveIn
      : (window?.available_from ?? "");
  const stay =
    query.stayMonths && query.stayMonths >= listing.min_stay_months
      ? query.stayMonths
      : listing.min_stay_months;
  const moveOut = moveIn ? addMonths(moveIn, stay) : "";
  const tags = goodForTags(listing.good_for ?? []);
  const facts = propertyFactLine({
    type: propertyTypeName(listing.property_type),
    squareFeet: listing.square_feet,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    pets: petTag(listing),
  });
  const cells = trustCells({
    calendarUpdatedAt: listing.calendar_updated_at,
    landlord,
  });
  const rooms =
    listing.rooms.length > 0
      ? [...listing.rooms].sort((left, right) => left.sort - right.sort)
      : listing.bedrooms > 0
        ? Array.from({ length: listing.bedrooms }, (_, index) => ({
            id: `count-${index}`,
            label: `Bedroom ${index + 1}`,
            beds: null as string | null,
          }))
        : [];
  const amenityGroups = groupedAmenities(listing.amenities);
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
  const blocked = expandRanges(listing.blocked_dates);

  return (
    <article className="px-5 py-7 md:px-8 lg:px-16">
      <p className="mb-4 text-[13px] text-muted">
        <Link href="/rentals" className="hover:text-ink">
          {locationShort(listing.location)}
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{propertyTypeName(listing.property_type)}</span>
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
        <div className="min-w-0">
          <h1 className="font-serif text-[clamp(2.25rem,4vw,3rem)] leading-[1.05] font-normal tracking-[-0.6px]">
            {listing.title}
          </h1>
          {tags.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li key={tag} className="rounded-[2px] border border-ink px-2.5 py-1 text-sm">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3.5 text-sm text-muted">{facts}</p>
          <TrustStrip cells={cells} />

          {listing.description ? (
            <p className="mt-8 max-w-[620px] text-base leading-relaxed text-ink">
              {listing.description}
            </p>
          ) : null}
          {listing.space_description ? (
            <>
              <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
                The space
              </h2>
              <p className="max-w-[620px] text-base leading-relaxed">{listing.space_description}</p>
            </>
          ) : null}

          {rooms.length > 0 ? (
            <>
              <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
                Rooms & beds
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {rooms.map((room) => (
                  <li key={room.id} className="border border-line px-4 py-4">
                    <p className="text-sm font-semibold">{room.label}</p>
                    {room.beds ? <p className="mt-1 text-sm text-muted">{room.beds}</p> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {amenityGroups.length > 0 ? (
            <>
              <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
                Amenities
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {amenityGroups.map((group) => (
                  <div key={group.group || "more"}>
                    {group.group ? <h3 className="text-sm font-semibold">{group.group}</h3> : null}
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {group.labels.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
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

          <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
            House rules
          </h2>
          <div className="max-w-[620px] space-y-2 text-[15px] leading-relaxed">
            <p>{petTag(listing)}</p>
            <p>{listing.smoking_allowed ? "Smoking allowed" : "No smoking"}</p>
            {listing.house_rules ? <p>{listing.house_rules}</p> : null}
          </div>

          <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.1em] text-muted uppercase">
            Availability
          </h2>
          <StayCalendar blocked={blocked} marked={window?.available_from} />

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
          availabilityLine={
            window ? `Available ${window.available_from}` : "Ask about availability"
          }
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
