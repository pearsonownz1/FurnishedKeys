import { activeLocations, cityLocations } from "@/lib/locations";
import { createPublicClient } from "@/lib/supabase/public";

/** One Where-dropdown row, in sort_order. */
export type WhereLocation = {
  id: string;
  slug: string;
  name: string;
  region: string;
  state: string;
  country: string;
  sort_order: number;
  parent_id: string | null;
  lat: number | null;
  lng: number | null;
};

function asNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function fromMirror(): WhereLocation[] {
  return activeLocations().map((location) => ({
    id: location.id,
    slug: location.slug,
    name: location.name,
    region: location.region,
    state: location.state,
    country: location.country,
    sort_order: location.sort_order,
    parent_id: location.parent_id,
    lat: location.lat,
    lng: location.lng,
  }));
}

/**
 * Active locations for the Where dropdown, ordered by sort_order.
 * Falls back to the static mirror when the database is unreachable.
 */
export async function loadWhereLocations(): Promise<WhereLocation[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("locations")
      .select("id, slug, name, region, state, country, sort_order, parent_id, lat, lng")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error || !data || data.length === 0) return fromMirror();
    return data.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      region: row.region,
      state: row.state,
      country: row.country,
      sort_order: asNumber(row.sort_order) ?? 0,
      parent_id: row.parent_id,
      lat: asNumber(row.lat),
      lng: asNumber(row.lng),
    }));
  } catch {
    return fromMirror();
  }
}

/** Wizard cities: the Where list without county rows that parent other places. */
export function loadCityLocationsFrom(rows: WhereLocation[]): WhereLocation[] {
  return cityLocations(
    rows.map((row) => ({
      ...row,
      active: true,
      sort: row.sort_order,
    })),
  ).map((location) => ({
    id: location.id,
    slug: location.slug,
    name: location.name,
    region: location.region,
    state: location.state,
    country: location.country,
    sort_order: location.sort_order,
    parent_id: location.parent_id,
    lat: location.lat,
    lng: location.lng,
  }));
}

export async function loadCityLocations(): Promise<WhereLocation[]> {
  return loadCityLocationsFrom(await loadWhereLocations());
}
