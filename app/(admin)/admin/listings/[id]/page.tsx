import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { loadAdminListings } from "@/lib/admin-load";

export default function AdminListingRedirect({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Go params={params} />
    </Suspense>
  );
}

async function Go({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const listings = await loadAdminListings();
  const listing = listings.find((row) => row.id === id);
  if (!listing) return notFound();
  if (listing.status === "pending_review") return redirect(`/admin/review?id=${listing.id}`);
  return redirect(`/admin/listings?status=${listing.status}`);
}
