"use client";

import { approximateCenter } from "@/lib/geo";
import type { BrowseView } from "@/lib/search";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ListingRow, type BrowseItem } from "./listing-row";

const AreaMap = dynamic(() => import("./area-map").then((mod) => mod.AreaMap), {
  ssr: false,
  loading: () => <div className="h-full min-h-[320px] w-full bg-[#e8e6df]" />,
});

export function BrowseBoard({
  items,
  title,
  summary,
  view,
  catalogError,
  placeCenter = null,
}: {
  items: BrowseItem[];
  title: string;
  summary: string;
  view: BrowseView;
  catalogError: boolean;
  placeCenter?: { lat: number; lng: number } | null;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const activeId =
    hoveredId && items.some((item) => item.id === hoveredId) ? hoveredId : (items[0]?.id ?? null);
  const phoneMap = view === "map";

  const points = items.flatMap((item) =>
    item.lat !== null && item.lng !== null
      ? [
          {
            id: item.id,
            slug: item.slug,
            lat: item.lat,
            lng: item.lng,
            priceLabel: item.priceLabel,
          },
        ]
      : [],
  );
  const center = approximateCenter(points) ?? placeCenter;

  return (
    <div className="lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_minmax(320px,46%)] lg:overflow-hidden">
      <div className={`${phoneMap ? "max-lg:sr-only" : ""} px-5 py-6 md:px-8 lg:overflow-y-auto`}>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-serif text-[clamp(2rem,4vw,2.375rem)] leading-none font-normal tracking-[-0.4px]">
            {title}
          </h1>
          <p className="text-[13px] text-muted">{summary}</p>
        </div>
        {catalogError ? (
          <p className="border-t border-line py-8 text-ink">We couldn&apos;t load homes just now.</p>
        ) : items.length === 0 ? (
          <p className="border-t border-line py-8 text-ink">
            No homes match these filters.{" "}
            <Link href="/rentals" className="font-semibold text-pine">
              Clear filters
            </Link>
          </p>
        ) : (
          <div>
            {items.map((item) => (
              <ListingRow
                key={item.id}
                item={item}
                active={item.id === activeId}
                onActive={setHoveredId}
              />
            ))}
          </div>
        )}
      </div>
      <div
        className={
          phoneMap
            ? "h-[calc(100dvh-8rem)] lg:h-full lg:border-l lg:border-line"
            : "hidden lg:block lg:h-full lg:border-l lg:border-line"
        }
      >
        <AreaMap points={points} activeId={activeId} onActive={setHoveredId} center={center} />
      </div>
    </div>
  );
}
