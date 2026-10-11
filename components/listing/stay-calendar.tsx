"use client";

import { monthCells, monthLabel, twoMonths } from "@/lib/calendar-ranges";

const weekdays = ["S", "M", "T", "W", "T", "F", "S"];

export function StayCalendar({
  blocked,
  onToggle,
  marked,
  now,
}: {
  blocked: string[];
  onToggle?: (iso: string) => void;
  marked?: string;
  now?: Date;
}) {
  const blockedSet = new Set(blocked);
  const months = twoMonths(now);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {months.map((month) => (
        <div key={`${month.year}-${month.month}`} className="min-w-0">
          <p className="mb-2 text-sm font-semibold">{monthLabel(month.year, month.month)}</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
            {weekdays.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells(month.year, month.month).map((cell) => {
              const hatched = cell.inMonth && blockedSet.has(cell.iso);
              const available = cell.inMonth && marked === cell.iso;
              const className = [
                "grid h-8 place-items-center rounded-[2px] text-xs",
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
      ))}
    </div>
  );
}
