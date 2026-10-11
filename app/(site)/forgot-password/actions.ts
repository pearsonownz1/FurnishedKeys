"use server";

import { deliverPasswordReset, type PasswordResetState } from "@/lib/auth-mail";

export type { PasswordResetState };

/** Sends a Resend recovery link. The same success comes back when the account is missing. */
export async function requestPasswordReset(
  _previous: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  return deliverPasswordReset(formData);
}
