"use client";

import { locationShort } from "@/lib/locations";
import {
  budgetOptions,
  formatMonthDay,
  listingQueryString,
  stayOptions,
  type ListingQuery,
} from "@/lib/search";
import { useRouter } from "next/navigation";
import { useState } from "react";

const chip =
  "shrink-0 cursor-pointer whitespace-nowrap rounded-[2px] border border-line bg-surface px-3 py-[9px] text-[13px] text-ink";
const chipOn =
  "shrink-0 cursor-pointer whitespace-nowrap rounded-[2px] border border-pine bg-pine-l px-3 py-[9px] text-[13px] font-semibold text-pine-d";

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

type MenuId = "where" | "dates" | "budget" | "type" | "beds" | "stay";

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
  places,
}: {
  query: ListingQuery;
  moveIns: { value: string; label: string }[];
  places: { id: string; slug: string; name: string; state: string }[];
}) {
  const router = useRouter();
  const place = places.find((item) => item.slug === query.where);
  const budget = budgetOptions.find((item) => Number(item.value) === query.budgetCents);
  const mapOn = query.view === "map";
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [moveIn, setMoveIn] = useState(query.moveIn ?? "");
  const [stay, setStay] = useState(query.stayMonths ? String(query.stayMonths) : "");

  function go(next: ListingQuery) {
    setMenu(null);
    router.push(`/rentals${listingQueryString(next)}`);
  }

  function toggle(id: MenuId) {
    setMenu((current) => (current === id ? null : id));
  }

  return (
    <div className="border-b border-line bg-surface">
      <div className="flex items-center gap-2 px-5 py-3.5 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto max-lg:flex-nowrap lg:flex-wrap lg:overflow-visible">
          <button
            type="button"
            className={place || menu === "where" ? chipOn : chip}
            aria-expanded={menu === "where"}
            onClick={() => toggle("where")}
          >
            {place ? locationShort(place) : "Anywhere"}
          </button>
          <button
            type="button"
            className={menu === "dates" ? chipOn : chip}
            aria-expanded={menu === "dates"}
            onClick={() => toggle("dates")}
          >
            {datesLabel(query)}
          </button>
          <button
            type="button"
            className={menu === "budget" ? chipOn : chip}
            aria-expanded={menu === "budget"}
            onClick={() => toggle("budget")}
          >
            {budget?.label ?? "Monthly budget"}
          </button>
          <button
            type="button"
            className={query.type || menu === "type" ? chipOn : chip}
            aria-expanded={menu === "type"}
            onClick={() => toggle("type")}
          >
            {types.find((item) => item.value === query.type)?.label ?? "Any type"}
          </button>
          <button
            type="button"
            className={query.studioOnly || query.bedroomsMin || menu === "beds" ? chipOn : chip}
            aria-expanded={menu === "beds"}
            onClick={() => toggle("beds")}
          >
            {bedsLabel(query)}
          </button>
          <button
            type="button"
            className={query.pets ? chipOn : chip}
            aria-pressed={Boolean(query.pets)}
            onClick={() => go({ ...query, pets: query.pets ? undefined : true })}
          >
            Pets
          </button>
          <button
            type="button"
            className={query.minStay || menu === "stay" ? chipOn : chip}
            aria-expanded={menu === "stay"}
            onClick={() => toggle("stay")}
          >
            {query.minStay ? `${query.minStay}-month min` : "Min stay"}
          </button>
        </div>
        <button
          type="button"
          aria-pressed={mapOn}
          className={`shrink-0 rounded-[2px] border px-3.5 py-[9px] text-[13px] lg:hidden ${
            mapOn ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink"
          }`}
          onClick={() => go({ ...query, view: mapOn ? undefined : "map" })}
        >
          Map
        </button>
      </div>
      {menu ? (
        <div className="border-t border-line px-5 py-3 md:px-8">
          {menu === "where" ? (
            <div className="grid w-max max-w-full min-w-48 border border-line bg-surface p-1">
              <MenuChoice label="Anywhere" onClick={() => go({ ...query, where: undefined })} />
              {places.map((item) => (
                <MenuChoice
                  key={item.id}
                  label={locationShort(item)}
                  onClick={() => go({ ...query, where: item.slug })}
                />
              ))}
            </div>
          ) : null}
          {menu === "dates" ? (
            <form
              className="w-56 max-w-full border border-line bg-surface p-3"
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
          ) : null}
          {menu === "budget" ? (
            <div className="grid w-max max-w-full min-w-44 border border-line bg-surface p-1">
              <MenuChoice label="Any budget" onClick={() => go({ ...query, budgetCents: undefined })} />
              {budgetOptions.map((option) => (
                <MenuChoice
                  key={option.value}
                  label={option.label}
                  onClick={() => go({ ...query, budgetCents: Number(option.value) })}
                />
              ))}
            </div>
          ) : null}
          {menu === "type" ? (
            <div className="grid w-max max-w-full min-w-40 border border-line bg-surface p-1">
              <MenuChoice label="Any type" onClick={() => go({ ...query, type: undefined })} />
              {types.map((item) => (
                <MenuChoice
                  key={item.value}
                  label={item.label}
                  onClick={() => go({ ...query, type: item.value })}
                />
              ))}
            </div>
          ) : null}
          {menu === "beds" ? (
            <div className="grid w-max max-w-full min-w-36 border border-line bg-surface p-1">
              {bedOptions.map((option) => (
                <MenuChoice
                  key={option.label}
                  label={option.label}
                  onClick={() =>
                    go({
                      ...query,
                      studioOnly: option.studio || undefined,
                      bedroomsMin: option.min,
                    })
                  }
                />
              ))}
            </div>
          ) : null}
          {menu === "stay" ? (
            <div className="grid w-max max-w-full min-w-40 border border-line bg-surface p-1">
              <MenuChoice label="Any minimum" onClick={() => go({ ...query, minStay: undefined })} />
              {stayOptions.map((option) => (
                <MenuChoice
                  key={option.value}
                  label={option.label}
                  onClick={() => go({ ...query, minStay: Number(option.value) })}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MenuChoice({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-stone" onClick={onClick}>
      {label}
    </button>
  );
}
