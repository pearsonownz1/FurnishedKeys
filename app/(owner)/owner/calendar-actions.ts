"use server";

import { confirmAvailability, setBlockedDates } from "@/app/(site)/owner/calendar-actions";

export type CalendarActionState = {
  ok: boolean;
  success?: boolean;
  formError?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

export async function confirmOwnerAvailability(
  _previous: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const result = await confirmAvailability(String(formData.get("listingId") ?? ""));
  if (!result.ok) return { ok: false, formError: result.formError };
  return { ok: true, success: true };
}

export async function toggleBlockedDay(
  _previous: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  const listingId = String(formData.get("listingId") ?? "");
  const day = String(formData.get("day") ?? "");
  const blocked = formData.get("blocked") === "true";
  const result = await setBlockedDates(listingId, day ? [day] : [], blocked);
  if (!result.ok) return { ok: false, formError: result.formError };
  return { ok: true, success: true };
}
