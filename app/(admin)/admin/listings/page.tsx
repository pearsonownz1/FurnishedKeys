import { connection } from "next/server";
import { Suspense } from "react";
import { ListingsTable } from "@/components/admin/listings-table";
import { loadAdminListings } from "@/lib/admin-load";
import { listingStatusParam } from "@/lib/admin-present";
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
  const [listings, params] = await Promise.all([loadAdminListings(), searchParams]);
  const raw = params.status;
  const status = listingStatusParam(Array.isArray(raw) ? raw[0] : raw);
  return <ListingsTable listings={listings} tab={status ?? "all"} />;
}
