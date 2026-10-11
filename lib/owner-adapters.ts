/**
 * Owner dashboard adapters for contracts Backend has not posted yet.
 * These functions do not call the database or any new endpoint.
 *
 * TODO(backend): calendar — load blocked dates for one listing, toggle a day,
 * and confirm availability.
 * TODO(backend): settings — save profile fields and email notification toggles.
 * TODO(backend): decline — close an inquiry from the inbox.
 */

export const CALENDAR_NOT_CONNECTED = "Calendar saving is not connected yet.";
export const SETTINGS_NOT_CONNECTED = "Settings saving is not connected yet.";
export const DECLINE_NOT_CONNECTED = "Decline isn't connected yet.";

export type OwnerSettingsInput = {
  name: string;
  email: string;
  phone: string;
  notifyInquiry: boolean;
  notifyMessage: boolean;
  notifyListingStatus: boolean;
};

export type AdapterResult = { ok: false; formError: string };

/** TODO(backend): replace with the owner calendar read. */
export async function loadBlockedDates(listingId: string): Promise<string[]> {
  void listingId;
  return [];
}

/** TODO(backend): replace with the owner calendar confirm. */
export async function confirmAvailability(listingId: string): Promise<AdapterResult> {
  void listingId;
  return { ok: false, formError: CALENDAR_NOT_CONNECTED };
}

/** TODO(backend): replace with the owner settings write. */
export async function saveSettings(input: OwnerSettingsInput): Promise<AdapterResult> {
  void input;
  return { ok: false, formError: SETTINGS_NOT_CONNECTED };
}

/** TODO(backend): replace with the inquiry decline write. */
export async function declineInquiryRequest(inquiryId: string): Promise<AdapterResult> {
  void inquiryId;
  return { ok: false, formError: DECLINE_NOT_CONNECTED };
}
