"use client";

import { DateField } from "@/components/date-field";
import {
  budgetOptions,
  DEFAULT_BUDGET_CENTS,
  listingQueryString,
  moveOutAfterMoveInChange,
  type ListingQuery,
} from "@/lib/search";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

export function SearchForm({
  places,
  defaultWhere,
  initial,
}: {
  places: { id: string; slug: string; label: string }[];
  defaultWhere: string;
  initial?: ListingQuery;
}) {
  const router = useRouter();
  const [moveIn, setMoveIn] = useState(initial?.moveIn ?? "");
  const [moveOut, setMoveOut] = useState(initial?.flexible ? "" : (initial?.moveOut ?? ""));
  const [flexible, setFlexible] = useState(Boolean(initial?.flexible));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const where = String(data.get("where") ?? "");
    const budget = Number(data.get("budget_cents"));
    const next: ListingQuery = {};
    if (where) next.where = where;
    if (moveIn) next.moveIn = moveIn;
    if (flexible) next.flexible = true;
    else if (moveOut) next.moveOut = moveOut;
    if (Number.isFinite(budget) && budget > 0) next.budgetCents = budget;
    router.push(`/rentals${listingQueryString(next)}`);
  }

  return (
    <form
      action="/rentals"
      method="get"
      aria-label="Search furnished homes"
      onSubmit={onSubmit}
      className="grid overflow-hidden rounded-[2px] bg-surface text-ink shadow-search lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
    >
      <Field label="Where" htmlFor="where">
        <select
          id="where"
          name="where"
          defaultValue={initial?.where ?? defaultWhere}
          className="field-input"
        >
          {places.map((place) => (
            <option key={place.id} value={place.slug}>
              {place.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Move in" htmlFor="search-move-in">
        <DateField
          id="search-move-in"
          label="Move in"
          value={moveIn}
          onChange={(next) => {
            setMoveIn(next);
            setMoveOut((current) => moveOutAfterMoveInChange(next, current));
          }}
        />
      </Field>
      <Field label="Move out" htmlFor="search-move-out">
        <DateField
          id="search-move-out"
          label="Move out"
          value={flexible ? "" : moveOut}
          min={moveIn || undefined}
          disabled={flexible}
          onChange={setMoveOut}
        />
        <label className="mt-1.5 flex min-h-11 cursor-pointer items-center gap-2 text-sm lg:min-h-0">
          <input
            type="checkbox"
            name="flexible"
            value="1"
            checked={flexible}
            onChange={(event) => {
              const checked = event.target.checked;
              setFlexible(checked);
              if (checked) setMoveOut("");
            }}
            className="size-4 accent-pine"
          />
          I&apos;m not sure
        </label>
      </Field>
      <Field label="Monthly budget" htmlFor="budget_cents" last>
        <select
          id="budget_cents"
          name="budget_cents"
          defaultValue={
            initial?.budgetCents ? String(initial.budgetCents) : DEFAULT_BUDGET_CENTS
          }
          className="field-input"
        >
          {budgetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="submit"
        className="h-full min-h-14 bg-pine px-8 py-4 text-[15px] font-semibold text-white focus-visible:outline-white lg:py-0"
      >
        Search homes
      </button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  last = false,
  children,
}: {
  label: string;
  htmlFor: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`min-w-0 border-b border-line px-[22px] py-[18px] lg:border-b-0 ${last ? "" : "lg:border-r"}`}
    >
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[11px] tracking-[0.1em] text-muted uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
