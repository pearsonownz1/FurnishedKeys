export const MAX_LISTING_PHOTOS = 20;

export function photosExceedLimit(existing: number, incoming: number): boolean {
  return existing + incoming > MAX_LISTING_PHOTOS;
}

export function coverPhotoId(
  photos: { id: string; is_cover: boolean; sort: number }[],
): string | null {
  if (photos.length === 0 || photos.some((photo) => photo.is_cover)) return null;
  const [first] = [...photos].sort(
    (left, right) => left.sort - right.sort || left.id.localeCompare(right.id),
  );
  return first?.id ?? null;
}

export type BedroomInput = { label?: string; beds: string };

export function bedroomInserts(listingId: string, rooms: BedroomInput[]) {
  return rooms.map((room, index) => ({
    listing_id: listingId,
    sort: index + 1,
    beds: room.beds,
    ...(room.label ? { label: room.label } : {}),
  }));
}

/**
 * Same split as public.public_listing_landlord: first token, and the first
 * letter of the last token when the name has more than one word.
 */
export function publicLandlordName(fullName: string | null | undefined): {
  first_name: string | null;
  last_initial: string | null;
} {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) return { first_name: null, last_initial: null };
  const tokens = trimmed.split(/\s+/);
  const last = tokens.length >= 2 ? tokens[tokens.length - 1] : "";
  return {
    first_name: tokens[0] || null,
    last_initial: last ? last.charAt(0).toUpperCase() : null,
  };
}
