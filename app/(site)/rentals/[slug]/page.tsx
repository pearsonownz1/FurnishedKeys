import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  confirmationLabel,
  formatFee,
  getListingBySlug,
  getPublicListings,
  latestConfirmedAt,
  listingFacts,
  minimumStayLabel,
  orderedFees,
  photoSrc,
  primaryPhoto,
} from "@/lib/listings";
import { locationShort } from "@/lib/locations";
import { formatCents } from "@/lib/money";

export function generateStaticParams() {
  return getPublicListings().map((listing) => ({ slug: listing.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) return { title: "Home" };
  return {
    title: listing.title,
    description: listing.description,
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = getListingBySlug(slug);
  if (!listing) notFound();

  const photo = primaryPhoto(listing);
  const confirmed = latestConfirmedAt(listing.availability_windows);

  return (
    <article className="shell py-12 lg:py-16">
      <p className="text-sm text-muted">
        <Link href="/rentals" className="font-semibold text-pine">
          All homes
        </Link>
        <span aria-hidden="true"> · </span>
        {locationShort(listing.location)}
      </p>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-stone">
          {photo ? (
            <Image
              src={photoSrc(photo.storage_path)}
              alt={photo.caption ?? listing.title}
              fill
              priority
              sizes="(min-width: 1024px) 720px, 100vw"
              className="object-cover"
            />
          ) : null}
          {listing.is_demo ? (
            <span className="absolute top-3 left-3 rounded-[2px] bg-white/92 px-2 py-[5px] text-[11px] font-semibold tracking-[0.06em] text-ink uppercase">
              Demo listing
            </span>
          ) : null}
        </div>
        <div>
          <h1 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.8px]">
            {listing.title}
          </h1>
          <p className="mt-3 text-sm text-muted">{listingFacts(listing)}</p>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="text-[28px] font-semibold">
              {formatCents(listing.monthly_rent_cents)}
            </span>
            <span className="text-sm text-muted">/ month rent</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink">
            {orderedFees(listing.fees).map((fee) => (
              <li key={fee.id} className="flex justify-between gap-4 border-b border-line pb-2">
                <span>{formatFee(fee)}</span>
                <span className="text-muted">
                  {fee.frequency === "monthly" ? "Monthly" : "One time"}
                  {fee.refundable ? " · Refundable" : ""}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-4 border-b border-line pb-2">
              <span>{minimumStayLabel(listing.min_stay_months)}</span>
              <span className="text-muted">Stay</span>
            </li>
          </ul>
          {confirmed ? (
            <p className="mt-4 flex items-center gap-1.5 text-sm text-ok">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
              {confirmationLabel(confirmed)}
            </p>
          ) : null}
          <p className="mt-6 text-[15px] leading-relaxed text-ink">{listing.description}</p>
          <p className="mt-6 text-sm text-muted">
            Inquiries are not open yet. You can still compare rent, fees, and
            availability here.
          </p>
        </div>
      </div>
    </article>
  );
}
