"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useHydrated } from "@/components/auth/use-hydrated";
import type { PropertyType } from "@/lib/db/types";
import { propertyTypeName } from "@/lib/property-display";

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

const labelClass = "text-[11px] tracking-[0.14em] text-muted uppercase";

const propertyChoices = ["adu", "apartment", "room", "house"] as const satisfies readonly PropertyType[];

const existingAccountCopy = "That email already has an account, sign in instead";

function ExistingAccountMessage() {
  const [before, after] = existingAccountCopy.split("sign in");
  return (
    <>
      {before}
      <Link href="/sign-in" className="font-semibold text-pine">
        sign in
      </Link>
      {after}
    </>
  );
}

export function SignupForm({
  places,
  source,
}: {
  places: { id: string; label: string }[];
  source: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [propertyType, setPropertyType] = useState<PropertyType>(propertyChoices[0]);
  const [locationId, setLocationId] = useState(places[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [pending, setPending] = useState(false);

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || phone.trim().length < 7) {
      setExistingAccount(false);
      setError("Add your first name, last name, email, and phone.");
      return;
    }
    if (password.length < 8) {
      setExistingAccount(false);
      setError("Password needs at least 8 characters");
      return;
    }
    setPending(true);
    setError(null);
    setExistingAccount(false);
    const response = await fetch("/api/owners/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email: email.trim(),
        phone: phone.trim(),
        password,
        property_type: propertyType,
        location_id: locationId,
        ...(source ? { source } : {}),
      }),
    });
    const body = (await response.json().catch(() => null)) as {
      listing_id?: string;
      error?: string;
    } | null;
    setPending(false);
    if (response.status === 401) {
      setExistingAccount(true);
      setError(existingAccountCopy);
      return;
    }
    if (response.status === 422 && /password/i.test(body?.error ?? "")) {
      setError("Password needs at least 8 characters");
      return;
    }
    if (!response.ok || !body?.listing_id) {
      setError(body?.error ?? "We couldn't start this listing. Please try again.");
      return;
    }
    router.push(`/owners/listings/${body.listing_id}/setup`);
  }

  return (
    <form method="post" className="max-w-md" onSubmit={(event) => void start(event)} noValidate>
      <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
        Create account
      </h1>
      <div className="mt-8 grid gap-4">
        <label className="grid gap-1">
          <span className={labelClass}>Property type</span>
          <select
            className={fieldClass}
            name="property_type"
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value as PropertyType)}
          >
            {propertyChoices.map((type) => (
              <option key={type} value={type}>
                {propertyTypeName(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>City</span>
          <select
            className={fieldClass}
            name="location_id"
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          >
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className={labelClass}>First name</span>
            <input
              className={fieldClass}
              name="first_name"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className={labelClass}>Last name</span>
            <input
              className={fieldClass}
              name="last_name"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
        </div>
        <label className="grid gap-1">
          <span className={labelClass}>Email</span>
          <input
            className={fieldClass}
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>Phone</span>
          <input
            className={fieldClass}
            type="tel"
            name="phone"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className={labelClass}>Password</span>
          <span className="flex gap-2">
            <input
              className={fieldClass}
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              aria-pressed={showPassword}
              className="shrink-0 rounded-[2px] border border-line px-3 text-sm"
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>
      </div>
      {error ? (
        <p className="mt-4 text-sm text-warn" role="alert">
          {existingAccount ? <ExistingAccountMessage /> : error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!hydrated || pending}
        className="mt-8 rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        Create account
      </button>
      <p className="mt-4 text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-pine">
          Sign in
        </Link>
      </p>
    </form>
  );
}
