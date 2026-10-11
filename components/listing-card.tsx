import Image from "next/image";
import Link from "next/link";
import {
  confirmationLabel,
  formatFee,
  latestConfirmedAt,
  listingFacts,
  minimumStayLabel,
  orderedFees,
  photoSrc,
  primaryPhoto,
  type PublicListing,
} from "@/lib/listings";
import { formatCents } from "@/lib/money";

export function ListingCard({ listing }: { listing: PublicListing }) {
  const photo = primaryPhoto(listing);
  const confirmed = latestConfirmedAt(listing.availability_windows);

  return (
    <article>
      <Link href={`/rentals/${listing.slug}`} className="group block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-stone">
          {photo ? (
            <Image
              src={photoSrc(photo.storage_path)}
              alt={photo.caption ?? listing.title}
              fill
              sizes="(min-width: 1024px) 360px, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : null}
          {listing.is_demo ? (
            <span className="absolute top-3 left-3 rounded-[2px] bg-white/92 px-2 py-[5px] text-[11px] font-semibold tracking-[0.06em] text-ink uppercase">
              Demo listing
            </span>
          ) : null}
        </div>
        <h3 className="mt-4 text-[17px] font-semibold tracking-tight">
          {listing.title}
        </h3>
        <p className="mt-1 text-sm text-muted">{listingFacts(listing)}</p>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-[22px] font-semibold">
            {formatCents(listing.monthly_rent_cents)}
          </span>
          <span className="text-[13px] text-muted">/ month rent</span>
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
          {orderedFees(listing.fees).map((fee) => (
            <li key={fee.id}>{formatFee(fee)}</li>
          ))}
          <li>{minimumStayLabel(listing.min_stay_months)}</li>
        </ul>
        {confirmed ? (
          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ok">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
            {confirmationLabel(confirmed)}
          </p>
        ) : null}
      </Link>
    </article>
  );
}
