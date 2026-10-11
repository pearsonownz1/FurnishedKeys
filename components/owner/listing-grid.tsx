import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import { NewListingButton } from "@/components/owner/new-listing-button";
import {
  listingActions,
  listingDetailLine,
  matchesListingFilter,
  type DashboardListing,
  type ListingFilter,
  type OwnerDashboardData,
} from "@/lib/owner-dashboard";
import { statusLabel, type BoardStatus } from "@/lib/owner-board";

const tabs: { id: ListingFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "drafts", label: "Drafts" },
  { id: "review", label: "In review" },
  { id: "live", label: "Live" },
];

export function ListingGrid({
  listings,
  counts,
  filter,
  locationId,
  banner,
}: {
  listings: DashboardListing[];
  counts: OwnerDashboardData["counts"];
  filter: ListingFilter;
  locationId: string;
  banner: string | null;
}) {
  const visible = listings.filter((listing) => matchesListingFilter(listing.statusGroup, filter));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 pb-24 md:px-10 md:py-8 md:pb-8">
      <h1 className="font-serif text-[40px] leading-[1.05] font-normal">Your listings</h1>
      <p className="mt-1.5 text-muted">Drafts save automatically. Pick up where you left off.</p>
      <NewListingButton
        locationId={locationId}
        className="mt-5 border border-pine py-2.5 text-center font-semibold text-pine md:hidden"
      />
      {banner ? <p className="mt-6 bg-pine-l px-4 py-3 text-pine-d">{banner}</p> : null}
      <div className="mt-6 flex gap-5 overflow-x-auto border-b border-line">
        {tabs.map((tab) => {
          const on = filter === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.id === "all" ? "/owner/listings" : `/owner/listings?filter=${tab.id}`}
              aria-current={on ? "page" : undefined}
              className={
                on
                  ? "-mb-px shrink-0 border-b-2 border-ink py-2 font-medium text-ink"
                  : "-mb-px shrink-0 py-2 text-muted"
              }
            >
              {tab.label} ({counts[tab.id]})
            </Link>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <div className="mt-5 border border-line bg-white px-6 py-10">
          <p className="text-muted">{filter === "all" ? "No listings yet." : "Nothing in this tab."}</p>
          {filter === "all" ? (
            <NewListingButton
              locationId={locationId}
              className="mt-4 max-w-xs border border-pine py-2.5 text-center font-semibold text-pine"
            />
          ) : null}
        </div>
      ) : (
        <ul className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ListingCard({ listing }: { listing: DashboardListing }) {
  const { cardHref, actions } = listingActions(listing);
  return (
    <li className="relative border border-line bg-white">
      <Link href={cardHref} className="absolute inset-0 z-0">
        <span className="sr-only">{listing.title}</span>
      </Link>
      <div className="pointer-events-none relative h-[150px] bg-stone">
        {listing.coverUrl ? (
          <CoverImage src={listing.coverUrl} alt="" sizes="(min-width: 1280px) 30vw, 100vw" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-[#9a958b]">Add a cover photo</div>
        )}
      </div>
      <div className="pointer-events-none relative px-4 pt-3.5">
        <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold ${pillClass(listing.status)}`}>
          {statusLabel(listing.status)}
        </span>
        <h2 className="mt-2 text-[15px] font-semibold">{listing.title}</h2>
        <p className="text-[13px] text-muted">{listingDetailLine(listing)}</p>
        <div className="mt-3 h-1 bg-stone" aria-hidden="true">
          <span
            className="block h-full bg-pine"
            style={{
              width: `${listing.statusGroup === "draft" ? (listing.stepIndex / listing.stepCount) * 100 : listing.percentComplete}%`,
            }}
          />
        </div>
        <p className="mt-1.5 text-[13px] text-muted">{listing.caption}</p>
      </div>
      <div className="relative z-10 flex flex-wrap gap-2 px-4 pt-3 pb-4">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className={
              action.tone === "primary"
                ? "bg-pine px-3.5 py-2 text-[13px] font-semibold text-white"
                : "border border-line bg-white px-3.5 py-2 text-[13px] font-semibold"
            }
          >
            {action.label}
          </Link>
        ))}
      </div>
    </li>
  );
}

function pillClass(status: BoardStatus): string {
  if (status === "live") return "bg-pine-l text-pine-d";
  if (status === "in_review") return "bg-stone text-muted";
  return "bg-[#f4ead8] text-warn";
}
