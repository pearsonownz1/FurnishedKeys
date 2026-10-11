export type StayOption = {
  value: string;
  label: string;
};

export type BudgetOption = {
  value: string;
  label: string;
};

export const stayOptions: StayOption[] = [
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
];

export const budgetOptions: BudgetOption[] = [
  { value: "150000", label: "Up to $1,500" },
  { value: "200000", label: "Up to $2,000" },
  { value: "250000", label: "Up to $2,500" },
  { value: "350000", label: "Up to $3,500" },
  { value: "500000", label: "Up to $5,000" },
];

export const DEFAULT_STAY_MONTHS = "3";
export const DEFAULT_BUDGET_CENTS = "250000";

export type BrowseView = "list" | "split" | "map";

export type ListingQuery = {
  where?: string;
  moveIn?: string;
  moveOut?: string;
  /** Open-ended stay. Move-out is ignored while this is set. */
  flexible?: boolean;
  stayMonths?: number;
  budgetCents?: number;
  view?: BrowseView;
  type?: "adu" | "apartment" | "room" | "house" | "other";
  bedroomsMin?: number;
  studioOnly?: boolean;
  pets?: boolean;
  minStay?: number;
};

export function defaultMoveIn(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const target = new Date(Date.UTC(year, day === 1 ? month : month + 1, 1));
  return target.toISOString().slice(0, 10);
}

export function formatMonthDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function moveInOptions(
  now = new Date(),
  count = 8,
): { value: string; label: string }[] {
  const first = defaultMoveIn(now);
  const [year, month] = first.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 + index, 1));
    const value = date.toISOString().slice(0, 10);
    return { value, label: formatMonthDay(value) };
  });
}

function firstParam(value: string | string[] | undefined): string | undefined {
  const picked = Array.isArray(value) ? value[0] : value;
  const trimmed = picked?.trim();
  return trimmed ? trimmed : undefined;
}

const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day, written YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  const match = isoDatePattern.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Earliest selectable day. Today is the default floor; `floor` (for example
 * the chosen move-in) can only move that later.
 */
export function calendarMin(today: string | null, floor?: string): string | null {
  const dates = [today, floor].filter((value): value is string =>
    Boolean(value && isIsoDate(value)),
  );
  if (dates.length === 0) return null;
  return dates.reduce((later, value) => (value > later ? value : later));
}

/** Clear move-out when move-in moves to a day after it. */
export function moveOutAfterMoveInChange(moveIn: string, moveOut: string): string {
  if (moveIn && moveOut && moveIn > moveOut) return "";
  return moveOut;
}

function isoParam(value: string | undefined): string | undefined {
  return value && isIsoDate(value) ? value : undefined;
}

export function parseListingQuery(
  raw: Record<string, string | string[] | undefined>,
): ListingQuery {
  const stay = Number(firstParam(raw.stay) ?? firstParam(raw.stay_months));
  const budget = Number(firstParam(raw.budget_cents));
  const moveIn =
    isoParam(firstParam(raw.moveIn)) ??
    isoParam(firstParam(raw.move_in)) ??
    isoParam(firstParam(raw["move-in"]));
  const explicitMoveOut = isoParam(firstParam(raw.moveOut));
  const flexible = firstParam(raw.flexible) === "1";
  const minStay = Number(firstParam(raw.min_stay));
  const beds = firstParam(raw.beds);
  const type = firstParam(raw.type);
  const view = firstParam(raw.view);
  const where = firstParam(raw.where);
  const propertyTypes = ["adu", "apartment", "room", "house", "other"] as const;
  const views = ["list", "split", "map"] as const;
  const query: ListingQuery = {};
  const stayMonths = Number.isFinite(stay) && stay > 0 ? stay : undefined;

  let moveOut = explicitMoveOut;
  if (!moveOut && !flexible && moveIn && stayMonths) {
    moveOut = addMonths(moveIn, stayMonths);
  }
  if (flexible || (moveOut && moveIn && moveOut <= moveIn)) moveOut = undefined;

  if (where) query.where = where;
  if (moveIn) query.moveIn = moveIn;
  if (moveOut) query.moveOut = moveOut;
  if (flexible) query.flexible = true;
  if (stayMonths) query.stayMonths = stayMonths;
  if (Number.isFinite(budget) && budget > 0) query.budgetCents = budget;
  const parsedView = views.find((item) => item === view);
  if (parsedView) query.view = parsedView;
  const parsedType = propertyTypes.find((item) => item === type);
  if (parsedType) query.type = parsedType;
  if (beds === "studio") query.studioOnly = true;
  else if (beds && Number(beds) > 0) query.bedroomsMin = Number(beds);
  if (firstParam(raw.pets) === "1") query.pets = true;
  if (Number.isFinite(minStay) && minStay > 0) query.minStay = minStay;

  return query;
}

export function listingQueryString(query: ListingQuery): string {
  const params = new URLSearchParams();
  if (query.where) params.set("where", query.where);
  if (query.moveIn) params.set("moveIn", query.moveIn);
  if (query.flexible) params.set("flexible", "1");
  else if (query.moveOut) params.set("moveOut", query.moveOut);
  if (query.stayMonths) params.set("stay_months", String(query.stayMonths));
  if (query.budgetCents) params.set("budget_cents", String(query.budgetCents));
  if (query.type) params.set("type", query.type);
  if (query.studioOnly) params.set("beds", "studio");
  else if (query.bedroomsMin) params.set("beds", String(query.bedroomsMin));
  if (query.pets) params.set("pets", "1");
  if (query.minStay) params.set("min_stay", String(query.minStay));
  if (query.view) params.set("view", query.view);
  const value = params.toString();
  return value ? `?${value}` : "";
}

/** Date params carried onto a listing so the inquiry form can pre-fill. */
export function stayLinkQuery(query: ListingQuery): string {
  const params = new URLSearchParams();
  if (query.moveIn) params.set("moveIn", query.moveIn);
  if (query.flexible) params.set("flexible", "1");
  else if (query.moveOut) params.set("moveOut", query.moveOut);
  const value = params.toString();
  return value ? `?${value}` : "";
}

export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, day));
  return date.toISOString().slice(0, 10);
}

export function formatMonthDayYear(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function stayMonthsBetween(start: string, end: string): number {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
    return 0;
  }
  let months = (endYear - startYear) * 12 + (endMonth - startMonth);
  if (endDay < startDay) months -= 1;
  return months;
}
