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

export type ListingQuery = {
  where?: string;
  moveIn?: string;
  stayMonths?: number;
  budgetCents?: number;
  view?: string;
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

export function parseListingQuery(
  raw: Record<string, string | string[] | undefined>,
): ListingQuery {
  const stay = Number(firstParam(raw.stay_months));
  const budget = Number(firstParam(raw.budget_cents));
  const moveIn = firstParam(raw.move_in);

  return {
    where: firstParam(raw.where),
    moveIn: moveIn && /^\d{4}-\d{2}-\d{2}$/.test(moveIn) ? moveIn : undefined,
    stayMonths: Number.isFinite(stay) && stay > 0 ? stay : undefined,
    budgetCents: Number.isFinite(budget) && budget > 0 ? budget : undefined,
    view: firstParam(raw.view),
  };
}
