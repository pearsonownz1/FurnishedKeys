import { connection } from "next/server";
import { Suspense } from "react";
import { brand } from "@/lib/brand";
import { getPublicListings } from "@/lib/listings";
import { locationPlace, primaryLocation } from "@/lib/locations";

export function SiteFooter() {
  const market = primaryLocation();

  return (
    <footer className="shell flex flex-col gap-2 py-12 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        {brand.name} · {locationPlace(market)}
      </p>
      <Suspense fallback={null}>
        <DemoNote />
      </Suspense>
    </footer>
  );
}

async function DemoNote() {
  await connection();
  let showing = false;
  try {
    const listings = await getPublicListings();
    showing = listings.some((listing) => listing.is_demo);
  } catch {
    showing = false;
  }
  if (!showing) return null;
  return <p>Demo listings shown during development</p>;
}
