import { OwnerInquiryCard } from "@/components/owner/inquiry-card";
import { statusLabel, type BoardInquiry, type BoardListing } from "@/lib/owner-board";

export function ListingBoard({
  listings,
  inquiries,
}: {
  listings: BoardListing[];
  inquiries: BoardInquiry[];
}) {
  return (
    <div>
      {listings.length === 0 ? (
        <p className="border border-line bg-surface px-5 py-6 text-sm text-muted">
          No listings yet.
        </p>
      ) : (
        <ul className="border border-line bg-surface">
          {listings.map((listing) => (
            <li key={listing.id} className="border-b border-line px-4 py-5 last:border-b-0 sm:px-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{listing.title}</h2>
                  <StatusPill status={listing.status} />
                </div>
                {listing.area ? <p className="mt-1 text-sm text-muted">{listing.area}</p> : null}
                {listing.status === "changes_requested" && listing.adminNote ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">{listing.adminNote}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-14 font-serif text-[clamp(2rem,4vw,2.75rem)] leading-none font-normal tracking-[-0.6px]">
        Inquiries
      </h2>
      {inquiries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No inquiries.</p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id} className="min-w-0">
              <OwnerInquiryCard inquiry={inquiry} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: BoardListing["status"] }) {
  const tone =
    status === "live"
      ? "bg-pine-l text-pine-d"
      : status === "changes_requested" || status === "rejected"
        ? "bg-stone text-warn"
        : "bg-stone text-ink";
  return (
    <span className={`rounded-[2px] px-2 py-0.5 text-xs font-semibold ${tone}`}>{statusLabel(status)}</span>
  );
}
