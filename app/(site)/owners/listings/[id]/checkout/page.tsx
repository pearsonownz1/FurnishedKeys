import { connection } from "next/server";
import { Suspense } from "react";
import { CheckoutPanel } from "@/components/listing/checkout-panel";
import { loadListingEditor } from "@/lib/listing-editor-load";
import { propertyTypeName } from "@/lib/property-display";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Checkout params={params} />
    </Suspense>
  );
}

async function Checkout({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const loaded = await loadListingEditor(id);

  const ready = loaded.status === "ready" ? loaded.listing : null;

  return (
    <CheckoutPanel
      listingId={id}
      propertyType={ready ? propertyTypeName(ready.draft.propertyType) : ""}
      placeLabel={ready?.placeLabel ?? ""}
    />
  );
}
