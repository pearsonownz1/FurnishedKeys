export type DateRange = {
  start_date: string;
  end_date: string;
};

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export function nextDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1));
  return date.toISOString().slice(0, 10);
}

/** Consecutive blocked days become one start/end row. The calendar PUT body has no ids. */
export function collapseDates(dates: string[]): DateRange[] {
  const unique = [...new Set(dates.filter((date) => dayPattern.test(date)))].sort();
  const ranges: DateRange[] = [];
  for (const date of unique) {
    const last = ranges[ranges.length - 1];
    if (last && nextDay(last.end_date) === date) {
      last.end_date = date;
      continue;
    }
    ranges.push({ start_date: date, end_date: date });
  }
  return ranges;
}

export function expandRanges(ranges: { start_date: string; end_date: string }[]): string[] {
  const dates: string[] = [];
  for (const range of ranges) {
    if (!dayPattern.test(range.start_date) || !dayPattern.test(range.end_date)) continue;
    let cursor = range.start_date;
    while (cursor <= range.end_date && dates.length < 800) {
      dates.push(cursor);
      cursor = nextDay(cursor);
    }
  }
  return dates;
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month, 1)));
}

export function monthCells(year: number, month: number): { iso: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month, 1));
  const startPad = first.getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: { iso: string; inMonth: boolean }[] = [];
  for (let index = 0; index < startPad; index += 1) {
    const date = new Date(Date.UTC(year, month, 1 - (startPad - index)));
    cells.push({ iso: date.toISOString().slice(0, 10), inMonth: false });
  }
  for (let day = 1; day <= days; day += 1) {
    cells.push({
      iso: new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10),
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    if (!last) break;
    cells.push({ iso: nextDay(last.iso), inMonth: false });
  }
  return cells;
}

/** Two months starting at the current UTC month. */
export function twoMonths(now = new Date()): { year: number; month: number }[] {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return [0, 1].map((offset) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
  });
}
