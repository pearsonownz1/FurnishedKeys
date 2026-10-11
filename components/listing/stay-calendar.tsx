"use client";

import {
  monthCells,
  monthIndex,
  monthLabel,
  shiftMonth,
  type CalendarMonth,
} from "@/lib/calendar-ranges";
import { useState } from "react";

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

function monthFromDate(date: Date): CalendarMonth {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function monthFromKey(value?: string): CalendarMonth | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return null;
  return { year, month: month - 1 };
}

function monthKey(month: CalendarMonth): string {
  return `${month.year}-${String(month.month + 1).padStart(2, "0")}`;
}

function monthFromIso(iso?: string): CalendarMonth | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month] = iso.split("-").map(Number);
  if (!year || !month) return null;
  return { year, month: month - 1 };
}

export function StayCalendar({
  blocked,
  onToggle,
  marked,
  now,
  month,
  onMonthChange,
}: {
  blocked: string[];
  onToggle?: (iso: string) => void;
  marked?: string;
  now?: Date;
  /** `YYYY-MM`. Opens on this month when it is not before the current month. */
  month?: string;
  onMonthChange?: (month: string) => void;
}) {
  const floor = monthFromDate(now ?? new Date());
  const requested = monthFromKey(month);
  const markedMonth = monthFromIso(marked);
  const initial =
    requested && monthIndex(requested) >= monthIndex(floor)
      ? requested
      : markedMonth && monthIndex(markedMonth) > monthIndex(floor)
        ? markedMonth
        : floor;
  const [cursor, setCursor] = useState(initial);
  const blockedSet = new Set(blocked);
  const atFloor = monthIndex(cursor) <= monthIndex(floor);

  return (
    <div className="max-w-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous month"
          disabled={atFloor}
          className="grid size-8 place-items-center rounded-[2px] border border-line text-lg leading-none disabled:opacity-40"
          onClick={() =>
            setCursor((current) => {
              const next = shiftMonth(current, -1);
              onMonthChange?.(monthKey(next));
              return next;
            })
          }
        >
          <span aria-hidden="true">‹</span>
        </button>
        <p className="text-sm font-semibold">{monthLabel(cursor.year, cursor.month)}</p>
        <button
          type="button"
          aria-label="Next month"
          className="grid size-8 place-items-center rounded-[2px] border border-line text-lg leading-none"
          onClick={() =>
            setCursor((current) => {
              const next = shiftMonth(current, 1);
              onMonthChange?.(monthKey(next));
              return next;
            })
          }
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
        {weekdays.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthCells(cursor.year, cursor.month).map((cell) => {
          const hatched = cell.inMonth && blockedSet.has(cell.iso);
          const available = cell.inMonth && marked === cell.iso;
          const className = [
            "grid h-9 place-items-center rounded-[2px] text-xs",
            cell.inMonth ? "text-ink" : "text-transparent",
            hatched ? "bg-stone text-ink" : "",
            available ? "ring-1 ring-pine" : "",
          ].join(" ");
          const style = hatched
            ? {
                backgroundImage:
                  "repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(27,30,28,0.28) 3px, rgba(27,30,28,0.28) 4px)",
              }
            : undefined;
          if (!cell.inMonth || !onToggle) {
            return (
              <span key={cell.iso} className={className} style={style}>
                {cell.inMonth ? Number(cell.iso.slice(-2)) : ""}
              </span>
            );
          }
          return (
            <button
              key={cell.iso}
              type="button"
              aria-pressed={hatched}
              aria-label={hatched ? `${cell.iso} blocked` : cell.iso}
              className={className}
              style={style}
              onClick={() => onToggle(cell.iso)}
            >
              {Number(cell.iso.slice(-2))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
