import { connection } from "next/server";
import { Suspense } from "react";
import { ListingGrid } from "@/components/owner/listing-grid";
import { loadOwnerDashboard } from "@/lib/owner-dashboard-load";
import { listingFilter } from "@/lib/owner-dashboard";
import { confirmationBanner } from "@/lib/owner-board";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Your listings",
  description: "Live, in review, and draft listings for your account.",
  ...canonical("/owner/listings"),
};

type Search = Record<string, string | string[] | undefined>;

export default function ListingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Listings searchParams={searchParams} />
    </Suspense>
  );
}

async function Listings({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.filter;
  const filter = listingFilter(Array.isArray(raw) ? raw[0] : raw);
  const dashboard = await loadOwnerDashboard();
  const banner = confirmationBanner(dashboard.listings, new Date());
  return (
    <ListingGrid
      listings={dashboard.listings}
      counts={dashboard.counts}
      filter={filter}
      locationId={dashboard.locationId}
      banner={banner}
    />
  );
}
