"use client";

import Link from "next/link";
import { AdminPage, RecordCell, RecordTable, RecordTabs } from "@/components/admin/record-table";
import { ListingPublication } from "@/components/admin/listing-actions";
import { listingStatuses, type ListingStatus } from "@/lib/db/types";
import type { AdminListingRow } from "@/lib/admin-load";
import { formatCents } from "@/lib/money";
import { monthDay } from "@/lib/owner-dashboard";
import { listingStatusLabel, measure } from "@/lib/admin-present";
import { ownerListingPath } from "@/lib/site";

const tabs: { id: "all" | ListingStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending_review", label: "In review" },
  { id: "changes_requested", label: "Changes" },
  { id: "approved", label: "Live" },
  { id: "rejected", label: "Rejected" },
  { id: "archived", label: "Unpublished" },
];

export function ListingsTable({
  listings,
  tab,
}: {
  listings: AdminListingRow[];
  tab: "all" | ListingStatus;
}) {
  const counts = {
    all: listings.length,
    ...Object.fromEntries(listingStatuses.map((status) => [status, listings.filter((row) => row.status === status).length])),
  } as Record<"all" | ListingStatus, number>;
  const visible = tab === "all" ? listings : listings.filter((row) => row.status === tab);

  return (
    <AdminPage title="Listings" subtitle="Every listing on Furnished Keys, from draft through live.">
      <RecordTabs
        tabs={tabs.map((item) => ({
          href: item.id === "all" ? "/admin/listings" : `/admin/listings?status=${item.id}`,
          label: item.label,
          count: counts[item.id],
          on: tab === item.id,
        }))}
      />
      <RecordTable columns={["Listing", "Owner", "City", "Rent", "Status", "Updated", "Actions"]}>
        {visible.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-3.5 py-6 text-muted">
              No listings in this view.
            </td>
          </tr>
        ) : (
          visible.map((listing) => (
            <tr key={listing.id}>
              <RecordCell>
                <span className="block font-semibold">{listing.title?.trim() || "Untitled listing"}</span>
                <span className="text-muted">
                  {measure(listing.beds)} bd · {measure(listing.baths)} ba · {measure(listing.sqft)} sq ft
                </span>
              </RecordCell>
              <RecordCell>
                <span className="block">{listing.owner_name?.trim() || "Owner"}</span>
                {listing.owner_email ? <span className="text-muted">{listing.owner_email}</span> : null}
              </RecordCell>
              <RecordCell>{listing.city || "—"}</RecordCell>
              <RecordCell>{listing.rent == null ? "—" : `${formatCents(listing.rent)} / month`}</RecordCell>
              <RecordCell>
                <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold ${statusClass(listing.status)}`}>
                  {listingStatusLabel(listing.status)}
                </span>
              </RecordCell>
              <RecordCell>{monthDay(listing.updated_at)}</RecordCell>
              <RecordCell>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={ownerListingPath(listing.id, "setup")} className="font-semibold text-pine">
                    Edit
                  </Link>
                  {listing.status === "pending_review" ? (
                    <Link href={`/admin/review?id=${listing.id}`} className="font-semibold text-pine">
                      Review
                    </Link>
                  ) : null}
                  <ListingPublication id={listing.id} status={listing.status} />
                </div>
              </RecordCell>
            </tr>
          ))
        )}
      </RecordTable>
    </AdminPage>
  );
}

function statusClass(status: ListingStatus): string {
  if (status === "approved") return "bg-pine-l text-pine-d";
  if (status === "pending_review" || status === "changes_requested") return "bg-stone text-muted";
  if (status === "archived" || status === "rejected") return "bg-[#f1e3dc] text-clay";
  return "bg-[#f4ead8] text-warn";
}
