import { connection } from "next/server";
import { Suspense } from "react";
import { OwnerCalendar } from "@/components/owner/owner-calendar";
import { loadCalendar, loadOwnerDashboard } from "@/lib/owner-dashboard-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Calendar",
  description: "Block days and confirm availability for a listing.",
  ...canonical("/owner/calendar"),
};

type Search = Record<string, string | string[] | undefined>;

function currentMonth(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

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
  const rawListing = params.listing;
  const requested = Array.isArray(rawListing) ? rawListing[0] : rawListing;
  const rawMonth = params.month;
  const monthValue = Array.isArray(rawMonth) ? rawMonth[0] : rawMonth;
  const month = monthValue && /^\d{4}-\d{2}$/.test(monthValue) ? monthValue : currentMonth();
  const dashboard = await loadOwnerDashboard();
  const listings = dashboard.listings.map((listing) => ({ id: listing.id, title: listing.title }));
  const listingId = listings.some((listing) => listing.id === requested) ? requested! : (listings[0]?.id ?? null);
  const calendar = listingId ? await loadCalendar(listingId, month) : null;
  return (
    <OwnerCalendar
      key={`${listingId ?? "none"}-${month}`}
      listings={listings}
      listingId={listingId}
      blocked={calendar?.blocked_days ?? []}
      month={month}
    />
  );
}
