"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { changeEmail, changePassword, saveProfile, type SettingsState } from "@/app/(site)/owner/settings-actions";
import { settingsFieldValues, type DashboardOwner } from "@/lib/owner-dashboard";

const fieldClass = "h-[46px] w-full border border-line bg-white px-3 text-base";
const empty: SettingsState = { ok: false };

export function OwnerSettingsForm({ owner }: { owner: DashboardOwner }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 pb-24 md:px-10 md:py-8 md:pb-8">
      <h1 className="font-serif text-[40px] leading-[1.05] font-normal">Settings</h1>
      <div className="mt-8 max-w-xl border-y border-line">
        <ProfileForm owner={owner} />
        <EmailForm owner={owner} />
        <PasswordForm />
      </div>
    </div>
  );
}

function ProfileForm({ owner }: { owner: DashboardOwner }) {
  const loaded = settingsFieldValues(owner);
  const [name, setName] = useState(loaded.name);
  const [phone, setPhone] = useState(loaded.phone);
  const [notifyInquiry, setNotifyInquiry] = useState(loaded.notifyNewInquiry);
  const [notifyMessage, setNotifyMessage] = useState(loaded.notifyNewMessage);
  const [notifyStatus, setNotifyStatus] = useState(loaded.notifyListingStatus);
  const [state, action, pending] = useActionState(
    async (previous: SettingsState, formData: FormData) => {
      const result = await saveProfile(previous, formData);
      if (result.profile) {
        const next = settingsFieldValues(owner, result.profile);
        setName(next.name);
        setPhone(next.phone);
        setNotifyInquiry(next.notifyNewInquiry);
        setNotifyMessage(next.notifyNewMessage);
        setNotifyStatus(next.notifyListingStatus);
      }
      return result;
    },
    empty,
  );

  return (
    <form action={action} className="border-b border-line py-8">
      <h2 className="font-serif text-3xl font-normal">Profile</h2>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm">
          Name
          <input
            name="full_name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            className={fieldClass}
          />
          {state.fieldErrors?.full_name ? (
            <span className="text-warn">{state.fieldErrors.full_name}</span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm">
          Phone
          <input
            name="phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            className={fieldClass}
          />
          {state.fieldErrors?.phone ? <span className="text-warn">{state.fieldErrors.phone}</span> : null}
        </label>
      </div>
      <h2 className="mt-8 font-serif text-3xl font-normal">Email notifications</h2>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        <Toggle
          name="notify_new_inquiry"
          label="New inquiry"
          checked={notifyInquiry}
          onChange={setNotifyInquiry}
        />
        <Toggle
          name="notify_new_message"
          label="New message"
          checked={notifyMessage}
          onChange={setNotifyMessage}
        />
        <Toggle
          name="notify_listing_status"
          label="Listing status"
          checked={notifyStatus}
          onChange={setNotifyStatus}
        />
      </ul>
      <ActionStatus pending={pending} state={state} idle="Save" />
    </form>
  );
}

function EmailForm({ owner }: { owner: DashboardOwner }) {
  const [email, setEmail] = useState(owner.email);
  const [state, action, pending] = useActionState(changeEmail, empty);
  return (
    <form action={action} className="border-b border-line py-8">
      <h2 className="font-serif text-3xl font-normal">Email</h2>
      <label className="mt-5 grid gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className={fieldClass}
        />
        {state.fieldErrors?.email ? <span className="text-warn">{state.fieldErrors.email}</span> : null}
      </label>
      <ActionStatus pending={pending} state={state} idle="Update email" />
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [state, action, pending] = useActionState(
    async (previous: SettingsState, formData: FormData) => {
      const result = await changePassword(previous, formData);
      if (result.success) {
        setCurrent("");
        setNextPassword("");
      }
      return result;
    },
    empty,
  );

  return (
    <form action={action} className="py-8">
      <h2 className="font-serif text-3xl font-normal">Password</h2>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm">
          Current password
          <input
            name="current_password"
            type="password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
            className={fieldClass}
          />
          {state.fieldErrors?.current_password ? (
            <span className="text-warn">{state.fieldErrors.current_password}</span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm">
          New password
          <input
            name="new_password"
            type="password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            className={fieldClass}
          />
          {state.fieldErrors?.new_password ? (
            <span className="text-warn">{state.fieldErrors.new_password}</span>
          ) : null}
        </label>
      </div>
      <ActionStatus pending={pending} state={state} idle="Update password" />
      <p className="mt-4 text-sm text-muted">
        Forgot the current one?{" "}
        <Link href="/forgot-password" className="font-semibold text-pine">
          Email a reset link
        </Link>
      </p>
    </form>
  );
}

function ActionStatus({
  pending,
  state,
  idle,
}: {
  pending: boolean;
  state: SettingsState;
  idle: string;
}) {
  const successText = state.message ?? (state.success ? "Saved" : null);
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="bg-pine px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-70"
      >
        {pending ? "Saving…" : idle}
      </button>
      {state.formError ? (
        <p className="text-sm text-warn" role="alert">
          {state.formError}
        </p>
      ) : successText ? (
        <p className="text-sm text-pine" role="status">
          {successText}
        </p>
      ) : null}
    </div>
  );
}

function Toggle({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <li>
      <label className="flex items-center justify-between gap-4 py-3 text-sm">
        {label}
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 accent-pine"
        />
      </label>
    </li>
  );
}
