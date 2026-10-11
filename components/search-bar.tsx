import { connection } from "next/server";
import type { ReactNode } from "react";
import { activeLocations, locationShort, primaryLocation } from "@/lib/locations";
import {
  budgetOptions,
  DEFAULT_BUDGET_CENTS,
  DEFAULT_STAY_MONTHS,
  defaultMoveIn,
  moveInOptions,
  stayOptions,
} from "@/lib/search";

export async function SearchBar() {
  await connection();
  const now = new Date();
  const market = primaryLocation();
  const moveIns = moveInOptions(now);

  return (
    <form
      action="/rentals"
      method="get"
      aria-label="Search furnished homes"
      className="grid overflow-hidden rounded-[2px] bg-surface text-ink shadow-search lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
    >
      <Field label="Where" htmlFor="where">
        <select
          id="where"
          name="where"
          defaultValue={market.slug}
          className="field-input"
        >
          {activeLocations().map((location) => (
            <option key={location.id} value={location.slug}>
              {locationShort(location)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Move in" htmlFor="move_in">
        <select
          id="move_in"
          name="move_in"
          defaultValue={defaultMoveIn(now)}
          className="field-input"
        >
          {moveIns.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Stay" htmlFor="stay_months">
        <select
          id="stay_months"
          name="stay_months"
          defaultValue={DEFAULT_STAY_MONTHS}
          className="field-input"
        >
          {stayOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Monthly budget" htmlFor="budget_cents" last>
        <select
          id="budget_cents"
          name="budget_cents"
          defaultValue={DEFAULT_BUDGET_CENTS}
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
        className="bg-pine px-8 py-4 text-[15px] font-semibold text-white focus-visible:outline-white lg:py-0"
      >
        Search homes
      </button>
    </form>
  );
}

export function SearchBarSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid overflow-hidden rounded-[2px] bg-surface shadow-search lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
    >
      {["Where", "Move in", "Stay", "Monthly budget"].map((label, index) => (
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
      className={`border-b border-line px-[22px] py-[18px] lg:border-b-0 ${last ? "" : "lg:border-r"}`}
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
