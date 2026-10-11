import { brand } from "@/lib/brand";
import { getPublicListings } from "@/lib/listings";
import { locationPlace, primaryLocation } from "@/lib/locations";

export function SiteFooter() {
  const market = primaryLocation();
  const showingDemos = getPublicListings().some((listing) => listing.is_demo);

  return (
    <footer className="shell flex flex-col gap-2 py-12 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
      <p>
        {brand.name} · {locationPlace(market)}
      </p>
      {showingDemos ? <p>Demo listings shown during development</p> : null}
    </footer>
  );
}
