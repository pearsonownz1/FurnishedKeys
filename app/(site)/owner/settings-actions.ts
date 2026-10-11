"use server";

import { sessionUser } from "@/lib/api/owner-listing";

export type SettingsState = {
  ok: boolean;
  success?: boolean;
  formError?: string;
  fieldErrors?: Partial<
    Record<"full_name" | "phone" | "email" | "current_password" | "new_password", string>
  >;
  /** Set when an email change is waiting on the confirmation message. */
  message?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checked(value: FormDataEntryValue | null): boolean {
  return value === "true" || value === "on" || value === "1";
}

/** Saves the profile. Each notify box is true only for `true`, `on`, or `1`. An omitted box is false. */
export async function saveProfile(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, user } = await sessionUser();
  if (!user) return { ok: false, formError: "Sign in again." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const fieldErrors: SettingsState["fieldErrors"] = {};
  if (fullName.length > 200) fieldErrors.full_name = "Keep the name under 200 characters.";
  if (phoneRaw.length > 40) fieldErrors.phone = "Keep the phone number under 40 characters.";
  else if (phoneRaw && phoneRaw.replace(/\D/g, "").length < 7) {
    fieldErrors.phone = "Add a phone number.";
  }
  if (fieldErrors.full_name || fieldErrors.phone) return { ok: false, fieldErrors };

  const saved = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      phone: phoneRaw || null,
      notify_new_inquiry: checked(formData.get("notify_new_inquiry")),
      notify_new_message: checked(formData.get("notify_new_message")),
      notify_listing_status: checked(formData.get("notify_listing_status")),
    })
    .eq("id", user.id);
  if (saved.error) {
    console.error("profile save failed", saved.error.message);
    return { ok: false, formError: "We couldn't save your profile. Please try again." };
  }
  return { ok: true, success: true };
}

/** Asks Supabase to email a confirmation link. The address changes after that link is opened. */
export async function changeEmail(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, user } = await sessionUser();
  if (!user) return { ok: false, formError: "Sign in again." };

  const email = String(formData.get("email") ?? "").trim();
  if (!emailPattern.test(email) || email.length > 200) {
    return { ok: false, fieldErrors: { email: "Add a valid email." } };
  }

  const updated = await supabase.auth.updateUser({ email });
  if (updated.error) {
    console.error("email change failed", updated.error.message);
    return { ok: false, formError: "We couldn't update your email. Please try again." };
  }
  return {
    ok: true,
    success: true,
    message: "Check your inbox to confirm the new email.",
  };
}

/** Re-checks the current password, then sets the new one. New password is 8 to 72 characters. */
export async function changePassword(
  _previous: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const { supabase, user } = await sessionUser();
  if (!user?.email) return { ok: false, formError: "Sign in again." };

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const fieldErrors: SettingsState["fieldErrors"] = {};
  if (!current) fieldErrors.current_password = "Enter your current password.";
  if (next.length < 8) fieldErrors.new_password = "Use at least 8 characters.";
  else if (next.length > 72) fieldErrors.new_password = "Use at most 72 characters.";
  if (fieldErrors.current_password || fieldErrors.new_password) return { ok: false, fieldErrors };

  const verified = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (verified.error) {
    return { ok: false, formError: "That password doesn't match." };
  }

  const updated = await supabase.auth.updateUser({ password: next });
  if (updated.error) {
    console.error("password change failed", updated.error.message);
    return { ok: false, formError: "We couldn't update your password. Please try again." };
  }
  return { ok: true, success: true };
}
