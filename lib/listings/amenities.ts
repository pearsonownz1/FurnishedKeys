export const amenityGroups = ["Kitchen", "Interior", "Safety", "Laundry"] as const;

export type AmenityGroup = (typeof amenityGroups)[number];

export const amenityCatalog = [
  { key: "dining_table", label: "Dining table", group: "Kitchen" },
  { key: "full_fridge", label: "Full-size fridge", group: "Kitchen" },
  { key: "dishwasher", label: "Dishwasher", group: "Kitchen" },
  { key: "microwave", label: "Microwave", group: "Kitchen" },
  { key: "stovetop", label: "Stovetop", group: "Kitchen" },
  { key: "oven", label: "Oven", group: "Kitchen" },
  { key: "kitchen_essentials", label: "Kitchen essentials", group: "Kitchen" },
  { key: "coffee_maker", label: "Coffee maker", group: "Kitchen" },
  { key: "air_conditioning", label: "Air conditioning", group: "Interior" },
  { key: "heating", label: "Heating", group: "Interior" },
  { key: "wifi", label: "Wifi", group: "Interior" },
  { key: "tv", label: "TV", group: "Interior" },
  { key: "workspace", label: "Dedicated workspace", group: "Interior" },
  { key: "carbon_monoxide_detector", label: "Carbon monoxide detector", group: "Safety" },
  { key: "smoke_detector", label: "Smoke detector", group: "Safety" },
  { key: "fire_extinguisher", label: "Fire extinguisher", group: "Safety" },
  { key: "washer_dryer", label: "Washer and dryer", group: "Laundry" },
  { key: "iron", label: "Iron", group: "Laundry" },
] as const satisfies readonly { key: string; label: string; group: AmenityGroup }[];

export type AmenityKey = (typeof amenityCatalog)[number]["key"];

export const amenityKeys = amenityCatalog.map((item) => item.key) as [
  AmenityKey,
  ...AmenityKey[],
];

export function amenityLabel(key: AmenityKey): string {
  const item = amenityCatalog.find((entry) => entry.key === key);
  return item?.label ?? key;
}
