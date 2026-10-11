/** A closed ring about `radiusMeters` around a rounded coordinate. Not an address. */
export function approximateCircle(
  lng: number,
  lat: number,
  radiusMeters = 800,
  steps = 64,
): [number, number][] {
  const earth = 6_378_137;
  const coords: [number, number][] = [];
  for (let index = 0; index <= steps; index += 1) {
    const bearing = (index / steps) * Math.PI * 2;
    const north = radiusMeters * Math.cos(bearing);
    const east = radiusMeters * Math.sin(bearing);
    const latOffset = (north / earth) * (180 / Math.PI);
    const lngOffset =
      (east / (earth * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);
    coords.push([lng + lngOffset, lat + latOffset]);
  }
  return coords;
}

export function approximateCenter(
  points: { lat: number; lng: number }[],
): { lat: number; lng: number } | null {
  if (points.length === 0) return null;
  const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
  return { lat, lng };
}

export function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earth = 6_378_137;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type PricePin<T extends { id: string; lat: number; lng: number }> = {
  key: string;
  lat: number;
  lng: number;
  offsetX: number;
  offsetY: number;
  clustered: boolean;
  items: T[];
};

/**
 * Pins that sit on top of each other (common for downtown approximate areas)
 * are spread a few dozen pixels apart. Groups of `clusterAt` or more collapse
 * to one pin until `expandedKey` matches that group.
 */
export function placePricePins<T extends { id: string; lat: number; lng: number }>(
  points: T[],
  options?: {
    thresholdMeters?: number;
    clusterAt?: number;
    expandedKey?: string | null;
  },
): PricePin<T>[] {
  const threshold = options?.thresholdMeters ?? 180;
  const clusterAt = options?.clusterAt ?? 6;
  const groups = groupByDistance(points, threshold);
  const placed: PricePin<T>[] = [];

  for (const items of groups) {
    const key = items
      .map((item) => item.id)
      .sort()
      .join("|");
    const expanded = options?.expandedKey === key;
    if (items.length >= clusterAt && !expanded) {
      const center = approximateCenter(items);
      placed.push({
        key,
        lat: center?.lat ?? items[0].lat,
        lng: center?.lng ?? items[0].lng,
        offsetX: 0,
        offsetY: 0,
        clustered: true,
        items,
      });
      continue;
    }
    if (items.length === 1) {
      const item = items[0];
      placed.push({
        key: item.id,
        lat: item.lat,
        lng: item.lng,
        offsetX: 0,
        offsetY: 0,
        clustered: false,
        items,
      });
      continue;
    }
    const radius = 26 + items.length * 8;
    items.forEach((item, index) => {
      const angle = -Math.PI / 2 + (index / items.length) * Math.PI * 2;
      placed.push({
        key: item.id,
        lat: item.lat,
        lng: item.lng,
        offsetX: Math.round(Math.cos(angle) * radius),
        offsetY: Math.round(Math.sin(angle) * radius),
        clustered: false,
        items: [item],
      });
    });
  }

  return placed;
}

function groupByDistance<T extends { lat: number; lng: number }>(
  points: T[],
  thresholdMeters: number,
): T[][] {
  const parent = points.map((_, index) => index);
  const find = (index: number): number => {
    let cursor = index;
    while (parent[cursor] !== cursor) cursor = parent[cursor] ?? cursor;
    return cursor;
  };
  const union = (left: number, right: number) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent[b] = a;
  };
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const left = points[i];
      const right = points[j];
      if (left && right && metersBetween(left, right) <= thresholdMeters) union(i, j);
    }
  }
  const groups = new Map<number, T[]>();
  points.forEach((point, index) => {
    const root = find(index);
    const list = groups.get(root) ?? [];
    list.push(point);
    groups.set(root, list);
  });
  return [...groups.values()];
}
