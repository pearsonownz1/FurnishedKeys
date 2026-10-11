import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import {
  allInLine,
  bedsAndSleeps,
  latestConfirmedAt,
  minimumStayLabel,
  primaryPhoto,
  propertyTypeLabel,
  type PublicListing,
} from "@/lib/listings";
import { formatCents } from "@/lib/money";

export function ListingCard({
  listing,
  imageUrl,
  search = "",
}: {
  listing: PublicListing;
  imageUrl: string | null;
  search?: string;
}) {
  const photo = primaryPhoto(listing);
  const confirmed = latestConfirmedAt(listing.availability_windows);

  return (
    <article>
      <Link href={`/rentals/${listing.slug}${search}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-stone">
          <CoverImage
            src={imageUrl}
            alt={photo?.caption ?? listing.title}
            sizes="(min-width: 1024px) 360px, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {listing.is_demo ? (
            <span className="absolute top-3 left-3 rounded-[2px] bg-white/92 px-2 py-[5px] text-[11px] font-semibold tracking-[0.06em] text-ink uppercase">
              Demo listing
            </span>
          ) : null}
        </div>
        <h3 className="mt-4 text-[17px] font-semibold tracking-tight">{listing.title}</h3>
        <p className="mt-1 text-sm text-muted">{propertyTypeLabel(listing.property_type)}</p>
        <p className="mt-1 text-sm text-muted">{bedsAndSleeps(listing)}</p>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-[22px] font-semibold">{formatCents(listing.monthly_rent_cents)}</span>
          <span className="text-[13px] text-muted">/ month rent</span>
        </p>
        <p className="mt-1 text-[13px] text-muted">{allInLine(listing)}</p>
        <p className="mt-2 text-xs text-muted">{minimumStayLabel(listing.min_stay_months)}</p>
        {confirmed ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ok">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
            Availability confirmed
          </p>
        ) : null}
      </Link>
    </article>
  );
}
