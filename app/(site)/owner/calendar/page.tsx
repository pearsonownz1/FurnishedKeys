import { connection } from "next/server";
import { Suspense } from "react";
import { OwnerCalendar } from "@/components/owner/owner-calendar";
import { loadBlockedDates } from "@/lib/owner-adapters";
import { loadOwnerDashboard } from "@/lib/owner-dashboard-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Calendar",
  description: "Block days and confirm availability for a listing.",
  ...canonical("/owner/calendar"),
};

type Search = Record<string, string | string[] | undefined>;

export default function CalendarPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Calendar searchParams={searchParams} />
    </Suspense>
  );
}

async function Calendar({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.listing;
  const requested = Array.isArray(raw) ? raw[0] : raw;
  const dashboard = await loadOwnerDashboard();
  const listings = dashboard.listings.map((listing) => ({ id: listing.id, title: listing.title }));
  const listingId = listings.some((listing) => listing.id === requested) ? requested! : (listings[0]?.id ?? null);
  const blocked = listingId ? await loadBlockedDates(listingId) : [];
  return <OwnerCalendar key={listingId ?? "none"} listings={listings} listingId={listingId} blocked={blocked} />;
}
