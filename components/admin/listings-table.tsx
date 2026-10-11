"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminPage, RecordCell, RecordTable, RecordTabs } from "@/components/admin/record-table";
import { setListingPublication } from "@/lib/admin-adapters";
import { monthDay } from "@/lib/owner-dashboard";
import { ownerListingPath } from "@/lib/site";
import {
  bucketLabel,
  type AdminListingRow,
  type ListingBucket,
  type ListingTab,
  type PublicationAction,
} from "@/lib/admin-console";

const tabs: { id: ListingTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "In review" },
  { id: "live", label: "Live" },
  { id: "paused", label: "Paused" },
];

export function ListingsTable({
  listings,
  counts,
  tab,
}: {
  listings: AdminListingRow[];
  counts: Record<ListingTab, number>;
  tab: ListingTab;
}) {
  return (
    <AdminPage title="Listings" subtitle="Every listing on Furnished Keys, from draft through live.">
      <RecordTabs
        tabs={tabs.map((item) => ({
          href: item.id === "all" ? "/admin/listings" : `/admin/listings?filter=${item.id}`,
          label: item.label,
          count: counts[item.id],
          on: tab === item.id,
        }))}
      />
      <RecordTable columns={["Listing", "Owner", "City", "Status", "Updated", "Actions"]}>
        {listings.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3.5 py-6 text-muted">
              No listings in this view.
            </td>
          </tr>
        ) : (
          listings.map((listing) => (
            <tr key={listing.id}>
              <RecordCell className="font-semibold">{listing.title}</RecordCell>
              <RecordCell>{listing.ownerName}</RecordCell>
              <RecordCell>{listing.city || "—"}</RecordCell>
              <RecordCell>
                <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold ${bucketClass(listing.bucket)}`}>
                  {bucketLabel(listing.bucket)}
                </span>
              </RecordCell>
              <RecordCell>{monthDay(listing.updatedAt)}</RecordCell>
              <RecordCell>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Link href={ownerListingPath(listing.id, "setup")} className="font-semibold text-pine">
                    Edit
                  </Link>
                  <PublicationButtons id={listing.id} bucket={listing.bucket} />
                </div>
              </RecordCell>
            </tr>
          ))
        )}
      </RecordTable>
    </AdminPage>
  );
}

function bucketClass(bucket: ListingBucket): string {
  if (bucket === "live") return "bg-pine-l text-pine-d";
  if (bucket === "review") return "bg-stone text-muted";
  if (bucket === "paused") return "bg-[#f1e3dc] text-clay";
  return "bg-[#f4ead8] text-warn";
}

function PublicationButtons({ id, bucket }: { id: string; bucket: ListingBucket }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const actions: { action: PublicationAction; label: string }[] =
    bucket === "live"
      ? [
          { action: "pause", label: "Pause" },
          { action: "unpublish", label: "Unpublish" },
        ]
      : bucket === "paused"
        ? [{ action: "resume", label: "Resume" }]
        : [];

  if (actions.length === 0 && !error) return null;

  async function run(action: PublicationAction) {
    setPending(true);
    const result = await setListingPublication({ listingId: id, action });
    setPending(false);
    setError(result.formError);
  }

  return (
    <>
      {actions.map((item) => (
        <button
          key={item.action}
          type="button"
          disabled={pending}
          onClick={() => void run(item.action)}
          className="font-semibold text-ink disabled:opacity-70"
        >
          {item.label}
        </button>
      ))}
      {error ? (
        <p className="basis-full text-xs text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
