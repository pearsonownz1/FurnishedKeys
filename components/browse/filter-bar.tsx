"use client";

import { activeLocations, locationShort } from "@/lib/locations";
import {
  budgetOptions,
  formatMonthDay,
  listingQueryString,
  stayOptions,
  type BrowseView,
  type ListingQuery,
} from "@/lib/search";
import { useRouter } from "next/navigation";
import { useState } from "react";

const chip =
  "cursor-pointer rounded-[2px] border border-line bg-surface px-3 py-[9px] text-[13px] text-ink";
const chipOn =
  "cursor-pointer rounded-[2px] border border-pine bg-pine-l px-3 py-[9px] text-[13px] font-semibold text-pine-d";

const types = [
  { value: "adu", label: "ADU" },
  { value: "apartment", label: "Apartment" },
  { value: "room", label: "Room" },
  { value: "house", label: "House" },
] as const;

const bedOptions = [
  { label: "Any", studio: false, min: undefined },
  { label: "Studio", studio: true, min: undefined },
  { label: "1+ bed", studio: false, min: 1 },
  { label: "2+ bed", studio: false, min: 2 },
  { label: "3+ bed", studio: false, min: 3 },
] as const;

function datesLabel(query: ListingQuery): string {
  if (query.moveIn && query.stayMonths) {
    const stay = query.stayMonths === 1 ? "1 month" : `${query.stayMonths} months`;
    return `${formatMonthDay(query.moveIn)} for ${stay}`;
  }
  if (query.moveIn) return formatMonthDay(query.moveIn);
  if (query.stayMonths) {
    return query.stayMonths === 1 ? "1 month" : `${query.stayMonths} months`;
  }
  return "Dates";
}

function bedsLabel(query: ListingQuery): string {
  if (query.studioOnly) return "Studio";
  if (query.bedroomsMin) return `${query.bedroomsMin}+ bed`;
  return "1+ bed";
}

export function FilterBar({
  query,
  moveIns,
}: {
  query: ListingQuery;
  moveIns: { value: string; label: string }[];
}) {
  const router = useRouter();
  const places = activeLocations();
  const place = places.find((item) => item.slug === query.where);
  const budget = budgetOptions.find((item) => Number(item.value) === query.budgetCents);
  const view = query.view ?? "split";
  const [moveIn, setMoveIn] = useState(query.moveIn ?? "");
  const [stay, setStay] = useState(query.stayMonths ? String(query.stayMonths) : "");

  function go(next: ListingQuery) {
    router.push(`/rentals${listingQueryString(next)}`);
  }

  const views: { id: BrowseView; label: string }[] = [
    { id: "list", label: "List" },
    { id: "split", label: "List + map" },
    { id: "map", label: "Map" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-5 py-3.5 md:px-8">
      <details className="relative">
        <summary className={place ? chipOn : chip}>
          {place ? locationShort(place) : "Anywhere"}
        </summary>
        <div className="absolute z-30 mt-2 min-w-48 border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(27,30,28,0.06)]">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
            onClick={() => go({ ...query, where: undefined })}
          >
            Anywhere
          </button>
          {places.map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
              onClick={() => go({ ...query, where: item.slug })}
            >
              {locationShort(item)}
            </button>
          ))}
        </div>
      </details>

      <details className="relative">
        <summary className={chip}>{datesLabel(query)}</summary>
        <form
          className="absolute z-30 mt-2 w-56 border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(27,30,28,0.06)]"
          onSubmit={(event) => {
            event.preventDefault();
            go({
              ...query,
              moveIn: moveIn || undefined,
              stayMonths: stay ? Number(stay) : undefined,
            });
          }}
        >
          <label className="block text-[10px] tracking-[0.1em] text-muted uppercase" htmlFor="filter-move-in">
            Move in
          </label>
          <select
            id="filter-move-in"
            value={moveIn}
            onChange={(event) => setMoveIn(event.target.value)}
            className="mt-1 w-full border border-line bg-surface px-2 py-1.5 text-sm"
          >
            <option value="">Any date</option>
            {moveIns.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-[10px] tracking-[0.1em] text-muted uppercase" htmlFor="filter-stay">
            Stay
          </label>
          <select
            id="filter-stay"
            value={stay}
            onChange={(event) => setStay(event.target.value)}
            className="mt-1 w-full border border-line bg-surface px-2 py-1.5 text-sm"
          >
            <option value="">Any length</option>
            {stayOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="mt-3 w-full rounded-[2px] bg-pine px-3 py-2 text-sm font-semibold text-white"
          >
            Apply
          </button>
        </form>
      </details>

      <details className="relative">
        <summary className={chip}>{budget?.label ?? "Monthly budget"}</summary>
        <div className="absolute z-30 mt-2 min-w-44 border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(27,30,28,0.06)]">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
            onClick={() => go({ ...query, budgetCents: undefined })}
          >
            Any budget
          </button>
          {budgetOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
              onClick={() => go({ ...query, budgetCents: Number(option.value) })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </details>

      <details className="relative">
        <summary className={query.type ? chipOn : chip}>
          {types.find((item) => item.value === query.type)?.label ?? "Any type"}
        </summary>
        <div className="absolute z-30 mt-2 min-w-40 border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(27,30,28,0.06)]">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
            onClick={() => go({ ...query, type: undefined })}
          >
            Any type
          </button>
          {types.map((item) => (
            <button
              key={item.value}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
              onClick={() => go({ ...query, type: item.value })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </details>

      <details className="relative">
        <summary className={query.studioOnly || query.bedroomsMin ? chipOn : chip}>
          {bedsLabel(query)}
        </summary>
        <div className="absolute z-30 mt-2 min-w-36 border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(27,30,28,0.06)]">
          {bedOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
              onClick={() =>
                go({
                  ...query,
                  studioOnly: option.studio || undefined,
                  bedroomsMin: option.min,
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </details>

      <button
        type="button"
        className={query.pets ? chipOn : chip}
        aria-pressed={Boolean(query.pets)}
        onClick={() => go({ ...query, pets: query.pets ? undefined : true })}
      >
        Pets
      </button>

      <details className="relative">
        <summary className={query.minStay ? chipOn : chip}>
          {query.minStay ? `${query.minStay}-month min` : "Min stay"}
        </summary>
        <div className="absolute z-30 mt-2 min-w-40 border border-line bg-surface p-1 shadow-[0_1px_2px_rgba(27,30,28,0.06)]">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
            onClick={() => go({ ...query, minStay: undefined })}
          >
            Any minimum
          </button>
          {stayOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-stone"
              onClick={() => go({ ...query, minStay: Number(option.value) })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </details>

      <div
        className="ml-auto flex overflow-hidden rounded-[2px] border border-line"
        role="group"
        aria-label="View"
      >
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={view === item.id}
            className={`px-3.5 py-[9px] text-[13px] ${view === item.id ? "bg-ink text-white" : "bg-surface text-ink"}`}
            onClick={() => go({ ...query, view: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
