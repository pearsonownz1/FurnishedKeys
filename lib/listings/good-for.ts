export const goodForCatalog = [
  { key: "ski_season", label: "Ski season" },
  { key: "traveling_nurses", label: "Traveling nurses" },
  { key: "relocating", label: "Relocating" },
  { key: "between_homes", label: "Between homes" },
  { key: "remote_workers", label: "Remote workers" },
  { key: "contract_workers", label: "Contract workers" },
  { key: "students", label: "Students" },
] as const;

export type GoodForKey = (typeof goodForCatalog)[number]["key"];

export const goodForKeys = goodForCatalog.map((item) => item.key) as [
  GoodForKey,
  ...GoodForKey[],
];

export function goodForLabel(key: GoodForKey): string {
  const item = goodForCatalog.find((entry) => entry.key === key);
  return item?.label ?? key;
}
