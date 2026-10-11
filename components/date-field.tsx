"use client";

import {
  monthCells,
  monthIndex,
  monthLabel,
  shiftMonth,
  type CalendarMonth,
} from "@/lib/calendar-ranges";
import {
  calendarMin,
  formatMonthDayYear,
  todayIso,
} from "@/lib/search";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

const weekdays = [
  { key: "sun", label: "S", name: "Sunday" },
  { key: "mon", label: "M", name: "Monday" },
  { key: "tue", label: "T", name: "Tuesday" },
  { key: "wed", label: "W", name: "Wednesday" },
  { key: "thu", label: "T", name: "Thursday" },
  { key: "fri", label: "F", name: "Friday" },
  { key: "sat", label: "S", name: "Saturday" },
] as const;

function monthFromIso(iso: string): CalendarMonth {
  const [year, month] = iso.split("-").map(Number);
  return { year: year ?? 1970, month: (month ?? 1) - 1 };
}

function shiftDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days));
  return date.toISOString().slice(0, 10);
}

function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function DateField({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = "Any date",
  min,
  disabled = false,
  invalid = false,
  variant = "field",
}: {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Extra floor. Dates before today are always disabled once the calendar is open. */
  min?: string;
  disabled?: boolean;
  invalid?: boolean;
  variant?: "field" | "plain";
}) {
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef("");
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [cursor, setCursor] = useState<CalendarMonth>({ year: 2026, month: 0 });
  const [focused, setFocused] = useState("");
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  const today = open ? todayIso() : null;
  const minDate = calendarMin(today, min);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onOther(event: Event) {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    }
    window.addEventListener("fk-date-open", onOther);
    return () => window.removeEventListener("fk-date-open", onOther);
  }, [open, id]);

  useEffect(() => {
    if (!open) return;
    const node = dialogRef.current?.querySelector<HTMLElement>(`[data-iso="${focused}"]`);
    node?.focus();
  }, [open, focused]);

  useEffect(() => {
    if (!open || narrow) return;
    function place() {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 320;
      const height = 380;
      let top = rect.bottom + 8;
      if (top + height > window.innerHeight - 8 && rect.top > height) {
        top = rect.top - height - 8;
      }
      let left = rect.left;
      if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
      if (left < 8) left = 8;
      setAnchor({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, narrow]);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (dialogRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !narrow) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, narrow]);

  function placeNearTrigger() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 320;
    const height = 380;
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight - 8 && rect.top > height) {
      top = rect.top - height - 8;
    }
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
    if (left < 8) left = 8;
    setAnchor({ top, left });
  }

  function openCalendar() {
    if (disabled) return;
    const start = value || minDate || todayIso();
    setCursor(monthFromIso(start));
    focusedRef.current = start;
    setFocused(start);
    placeNearTrigger();
    window.dispatchEvent(new CustomEvent("fk-date-open", { detail: id }));
    setOpen(true);
  }

  function close(restoreFocus: boolean) {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function disabledDay(iso: string): boolean {
    return Boolean(minDate && iso < minDate);
  }

  function choose(iso: string) {
    if (disabledDay(iso)) return;
    onChange(iso);
    close(true);
  }

  function moveFocus(days: number) {
    const next = shiftDays(focusedRef.current || value || minDate || todayIso(), days);
    focusedRef.current = next;
    setFocused(next);
    setCursor(monthFromIso(next));
  }

  function onDialogKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const steps: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      moveFocus(step);
      return;
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const delta = event.key === "PageUp" ? -1 : 1;
      const base = focusedRef.current || todayIso();
      const month = shiftMonth(monthFromIso(base), delta);
      const day = Number(base.slice(-2));
      const last = new Date(Date.UTC(month.year, month.month + 1, 0)).getUTCDate();
      const next = `${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
      focusedRef.current = next;
      setCursor(month);
      setFocused(next);
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const weekday = new Date(`${focused || todayIso()}T00:00:00Z`).getUTCDay();
      moveFocus(event.key === "Home" ? -weekday : 6 - weekday);
    }
  }

  const atFloor = Boolean(
    minDate && monthIndex(cursor) <= monthIndex(monthFromIso(minDate)),
  );
  const cells = monthCells(cursor.year, cursor.month);
  const shown = value ? formatMonthDayYear(value) : placeholder;
  const triggerClass =
    variant === "field"
      ? "field-input cursor-pointer text-left disabled:cursor-not-allowed"
      : "w-full cursor-pointer bg-transparent text-left text-sm disabled:cursor-not-allowed disabled:text-muted";

  const calendar = (
    <div
      className={
        narrow
          ? "fixed inset-0 z-[60] flex items-end bg-[rgba(27,30,28,0.4)]"
          : "contents"
      }
      onMouseDown={(event) => {
        if (narrow && event.target === event.currentTarget) close(false);
      }}
    >
      <div
        ref={dialogRef}
        id={dialogId}
        role="dialog"
        aria-modal={narrow}
        aria-label={`${label} calendar`}
        onKeyDown={onDialogKey}
        style={narrow || !anchor ? undefined : { top: anchor.top, left: anchor.left }}
        className={
          narrow
            ? "max-h-[min(32rem,90dvh)] w-full overflow-x-hidden overflow-y-auto bg-surface px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-search"
            : "fixed z-[60] w-80 max-w-[calc(100vw-1rem)] border border-line bg-surface p-3 shadow-search"
        }
      >
        {narrow ? (
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">{label}</p>
            <button
              type="button"
              className="min-h-11 px-3 text-sm font-semibold text-pine"
              onClick={() => close(true)}
            >
              Close
            </button>
          </div>
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            aria-label="Previous month"
            disabled={atFloor}
            className={`grid place-items-center rounded-[2px] border border-line text-lg leading-none disabled:opacity-40 ${
              narrow ? "size-11" : "size-9"
            }`}
            onClick={() => setCursor((current) => shiftMonth(current, -1))}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <h2 className="text-sm font-semibold" aria-live="polite">
            {monthLabel(cursor.year, cursor.month)}
          </h2>
          <button
            type="button"
            aria-label="Next month"
            className={`grid place-items-center rounded-[2px] border border-line text-lg leading-none ${
              narrow ? "size-11" : "size-9"
            }`}
            onClick={() => setCursor((current) => shiftMonth(current, 1))}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
        <div role="grid" aria-label={monthLabel(cursor.year, cursor.month)}>
          <div role="row" className="grid grid-cols-7 text-center text-[11px] text-muted">
            {weekdays.map((day) => (
              <span key={day.key} role="columnheader" aria-label={day.name} className="py-1">
                {day.label}
              </span>
            ))}
          </div>
          {Array.from({ length: cells.length / 7 }, (_, week) => (
            <div key={cells[week * 7]?.iso ?? week} role="row" className="grid grid-cols-7">
              {cells.slice(week * 7, week * 7 + 7).map((cell) => {
                const off = disabledDay(cell.iso);
                const selected = cell.iso === value;
                const isToday = cell.iso === today;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    role="gridcell"
                    data-iso={cell.iso}
                    tabIndex={cell.iso === focused ? 0 : -1}
                    aria-selected={selected}
                    aria-disabled={off}
                    aria-label={longDate(cell.iso)}
                    aria-current={isToday ? "date" : undefined}
                    className={[
                      "grid w-full place-items-center rounded-[2px] text-sm",
                      narrow ? "min-h-11" : "h-10",
                      off ? "cursor-not-allowed text-muted/40" : "text-ink hover:bg-stone",
                      cell.inMonth ? "" : "opacity-40",
                      selected ? "bg-pine font-semibold text-white hover:bg-pine" : "",
                      isToday && !selected ? "ring-1 ring-inset ring-pine" : "",
                    ].join(" ")}
                    onClick={() => choose(cell.iso)}
                  >
                    {Number(cell.iso.slice(-2))}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-label={value ? `${label}, ${formatMonthDayYear(value)}` : `${label}, ${placeholder}`}
        data-empty={value ? undefined : "true"}
        className={`${triggerClass}${invalid ? " text-warn" : ""}`}
        onClick={() => (open ? close(false) : openCalendar())}
      >
        {shown}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(calendar, document.body)
        : null}
    </>
  );
}
