import { connection } from "next/server";
import { SearchForm } from "@/components/search-form";
import { locationShort, primaryLocation } from "@/lib/locations";
import { loadWhereLocations, type WhereLocation } from "@/lib/locations-load";
import type { ListingQuery } from "@/lib/search";

export async function SearchBar({
  initial,
  places,
}: {
  initial?: ListingQuery;
  places?: WhereLocation[];
}) {
  await connection();
  const market = primaryLocation();
  const rows = places ?? (await loadWhereLocations());

  return (
    <SearchForm
      places={rows.map((location) => ({
        id: location.id,
        slug: location.slug,
        label: locationShort(location),
      }))}
      defaultWhere={market.slug}
      initial={initial}
    />
  );
}

export function SearchBarSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid overflow-hidden rounded-[2px] bg-surface shadow-search lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
    >
      {["Where", "Move in", "Move out", "Monthly budget"].map((label, index) => (
        <div
          key={label}
          className={`border-b border-line px-[22px] py-[18px] lg:border-b-0 ${index === 3 ? "" : "lg:border-r"}`}
        >
          <p className="mb-1.5 text-[11px] tracking-[0.1em] text-muted uppercase">
            {label}
          </p>
          <div className="h-[22px] bg-stone" />
        </div>
      ))}
      <div className="bg-pine px-8 py-4 text-center text-[15px] font-semibold text-white lg:py-0 lg:leading-[78px]">
        Search homes
      </div>
    </div>
  );
}
