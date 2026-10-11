"use client";

import Link from "next/link";
import { saveOwnerSettings } from "@/app/(owner)/owner/actions";
import type { AdapterResult } from "@/lib/owner-adapters";
import type { DashboardOwner } from "@/lib/owner-dashboard";
import { useActionState } from "react";

const fieldClass = "h-[46px] w-full border border-line bg-white px-3 text-base";

export function OwnerSettingsForm({ owner }: { owner: DashboardOwner }) {
  const [state, formAction, pending] = useActionState(saveOwnerSettings, null as AdapterResult | null);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 pb-24 md:px-10 md:py-8 md:pb-8">
      <h1 className="font-serif text-[40px] leading-[1.05] font-normal">Settings</h1>
      <form action={formAction} className="mt-8 max-w-xl border-y border-line">
        <section className="border-b border-line py-8">
          <h2 className="font-serif text-3xl font-normal">Profile</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm">
              Name
              <input name="name" defaultValue={owner.name} autoComplete="name" className={fieldClass} />
            </label>
            <label className="grid gap-1 text-sm">
              Email
              <input name="email" type="email" defaultValue={owner.email} autoComplete="email" className={fieldClass} />
            </label>
            <label className="grid gap-1 text-sm">
              Phone
              <input name="phone" type="tel" defaultValue={owner.phone} autoComplete="tel" className={fieldClass} />
            </label>
          </div>
        </section>
        <section className="border-b border-line py-8">
          <h2 className="font-serif text-3xl font-normal">Password</h2>
          <p className="mt-3 text-sm text-muted">We&apos;ll email you a link to choose a new password.</p>
          <Link href="/forgot-password" className="mt-3 inline-block font-semibold text-pine">
            Change password
          </Link>
        </section>
        <section className="py-8">
          <h2 className="font-serif text-3xl font-normal">Email notifications</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            <Toggle name="notifyInquiry" label="New inquiry" />
            <Toggle name="notifyMessage" label="New message" />
            <Toggle name="notifyListingStatus" label="Listing status" />
          </ul>
          {state?.formError ? (
            <p className="mt-4 text-sm text-warn" role="alert">
              {state.formError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-5 bg-pine px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-70"
          >
            Save
          </button>
        </section>
      </form>
    </div>
  );
}

function Toggle({ name, label }: { name: string; label: string }) {
  return (
    <li>
      <label className="flex items-center justify-between gap-4 py-3 text-sm">
        {label}
        <input type="checkbox" name={name} defaultChecked className="size-4 accent-pine" />
      </label>
    </li>
  );
}
