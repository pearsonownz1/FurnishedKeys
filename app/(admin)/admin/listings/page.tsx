import { connection } from "next/server";
import { Suspense } from "react";
import { ListingsTable } from "@/components/admin/listings-table";
import { listingTab, listingTabCounts } from "@/lib/admin-console";
import { loadAdminConsole } from "@/lib/admin-console-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Listings",
  description: "Every listing on Furnished Keys.",
  ...canonical("/admin/listings"),
};

type Search = Record<string, string | string[] | undefined>;

export default function AdminListingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}

async function Screen({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const gate = await loadAdminConsole();
  if (gate.kind !== "ready") return null;
  const params = await searchParams;
  const raw = params.filter;
  const tab = listingTab(Array.isArray(raw) ? raw[0] : raw);
  const listings = tab === "all" ? gate.data.listings : gate.data.listings.filter((row) => row.bucket === tab);
  return <ListingsTable listings={listings} counts={listingTabCounts(gate.data.listings)} tab={tab} />;
}
