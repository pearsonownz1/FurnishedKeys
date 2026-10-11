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
