"use client";

import Link from "next/link";
import { changeEmail, changePassword, saveProfile, type SettingsState } from "@/app/(site)/owner/settings-actions";
import type { DashboardOwner } from "@/lib/owner-dashboard";
import { useActionState } from "react";

const fieldClass = "h-[46px] w-full border border-line bg-white px-3 text-base";
const empty: SettingsState = { ok: false };

export function OwnerSettingsForm({ owner }: { owner: DashboardOwner }) {
  const [profile, saveProfileAction, profilePending] = useActionState(saveProfile, empty);
  const [emailState, changeEmailAction, emailPending] = useActionState(changeEmail, empty);
  const [passwordState, changePasswordAction, passwordPending] = useActionState(changePassword, empty);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 pb-24 md:px-10 md:py-8 md:pb-8">
      <h1 className="font-serif text-[40px] leading-[1.05] font-normal">Settings</h1>
      <div className="mt-8 max-w-xl border-y border-line">
        <form action={saveProfileAction} className="border-b border-line py-8">
          <h2 className="font-serif text-3xl font-normal">Profile</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm">
              Name
              <input name="full_name" defaultValue={owner.name} autoComplete="name" className={fieldClass} />
              {profile?.fieldErrors?.full_name ? (
                <span className="text-warn">{profile.fieldErrors.full_name}</span>
              ) : null}
            </label>
            <label className="grid gap-1 text-sm">
              Phone
              <input name="phone" type="tel" defaultValue={owner.phone} autoComplete="tel" className={fieldClass} />
              {profile?.fieldErrors?.phone ? <span className="text-warn">{profile.fieldErrors.phone}</span> : null}
            </label>
          </div>
          <h2 className="mt-8 font-serif text-3xl font-normal">Email notifications</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            <Toggle name="notify_new_inquiry" label="New inquiry" defaultChecked={owner.notifyNewInquiry} />
            <Toggle name="notify_new_message" label="New message" defaultChecked={owner.notifyNewMessage} />
            <Toggle name="notify_listing_status" label="Listing status" defaultChecked={owner.notifyListingStatus} />
          </ul>
          {profile?.formError ? (
            <p className="mt-4 text-sm text-warn" role="alert">
              {profile.formError}
            </p>
          ) : null}
          {profile?.success ? <p className="mt-4 text-sm text-pine">Saved</p> : null}
          <button
            type="submit"
            disabled={profilePending}
            className="mt-5 bg-pine px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            Save
          </button>
        </form>
        <form action={changeEmailAction} className="border-b border-line py-8">
          <h2 className="font-serif text-3xl font-normal">Email</h2>
          <label className="mt-5 grid gap-1 text-sm">
            Email
            <input name="email" type="email" defaultValue={owner.email} autoComplete="email" className={fieldClass} />
            {emailState?.fieldErrors?.email ? (
              <span className="text-warn">{emailState.fieldErrors.email}</span>
            ) : null}
          </label>
          {emailState?.formError ? (
            <p className="mt-4 text-sm text-warn" role="alert">
              {emailState.formError}
            </p>
          ) : null}
          {emailState?.message ? <p className="mt-4 text-sm text-pine">{emailState.message}</p> : null}
          <button
            type="submit"
            disabled={emailPending}
            className="mt-5 bg-pine px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            Update email
          </button>
        </form>
        <form action={changePasswordAction} className="py-8">
          <h2 className="font-serif text-3xl font-normal">Password</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm">
              Current password
              <input name="current_password" type="password" autoComplete="current-password" className={fieldClass} />
              {passwordState?.fieldErrors?.current_password ? (
                <span className="text-warn">{passwordState.fieldErrors.current_password}</span>
              ) : null}
            </label>
            <label className="grid gap-1 text-sm">
              New password
              <input name="new_password" type="password" autoComplete="new-password" minLength={8} className={fieldClass} />
              {passwordState?.fieldErrors?.new_password ? (
                <span className="text-warn">{passwordState.fieldErrors.new_password}</span>
              ) : null}
            </label>
          </div>
          {passwordState?.formError ? (
            <p className="mt-4 text-sm text-warn" role="alert">
              {passwordState.formError}
            </p>
          ) : null}
          {passwordState?.success ? <p className="mt-4 text-sm text-pine">Password updated</p> : null}
          <button
            type="submit"
            disabled={passwordPending}
            className="mt-5 bg-pine px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            Update password
          </button>
          <p className="mt-4 text-sm text-muted">
            Forgot the current one?{" "}
            <Link href="/forgot-password" className="font-semibold text-pine">
              Email a reset link
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <li>
      <label className="flex items-center justify-between gap-4 py-3 text-sm">
        {label}
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-pine" />
      </label>
    </li>
  );
}
