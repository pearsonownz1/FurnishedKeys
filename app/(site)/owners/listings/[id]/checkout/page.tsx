import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { canonical, ownerListingPath } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return canonical(ownerListingPath(id, "checkout"));
}

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Redirect params={params} />
    </Suspense>
  );
}

async function Redirect({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  redirect(`/owners/listings/${id}/setup`);
  return null;
}
