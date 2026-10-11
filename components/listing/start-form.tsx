"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PropertyType } from "@/lib/db/types";
import { propertyTypeName } from "@/lib/property-display";

const tiles = ["adu", "apartment", "room", "house"] as const satisfies readonly PropertyType[];

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

const labelClass = "text-[11px] tracking-[0.14em] text-muted uppercase";

export function StartForm({
  places,
  source,
}: {
  places: { id: string; label: string }[];
  source: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [propertyType, setPropertyType] = useState<PropertyType>("adu");
  const [locationId, setLocationId] = useState(places[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [pending, setPending] = useState(false);
  const place = places.find((item) => item.id === locationId)?.label ?? "";
  const stepLabel = `${propertyTypeName(propertyType)} · ${place}`;

  async function start() {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || phone.trim().length < 7) {
      setError("Add your first name, last name, email, and phone.");
      return;
    }
    setPending(true);
    setError(null);
    setNeedsSignIn(false);
    const response = await fetch("/api/owners/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: fullName,
        email: email.trim(),
        phone: phone.trim(),
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
    if (!response.ok || !body?.listing_id) {
      setNeedsSignIn(response.status === 401 && body?.error === "Sign in required");
      setError(body?.error ?? "We couldn't start this listing. Please try again.");
      return;
    }
    router.push(`/owners/listings/${body.listing_id}/plan`);
  }

  return (
    <div className="grid items-stretch md:grid-cols-2">
      <div className="px-5 py-10 md:px-10 lg:py-16 lg:pr-16 lg:pl-[max(1.25rem,calc((100vw-1200px)/2))]">
        <p className="text-xs tracking-[0.08em] text-muted">{stepLabel}</p>
        <div className="mt-6 flex gap-2" aria-hidden="true">
          <span className="h-1 flex-1 bg-pine" />
          <span className={`h-1 flex-1 ${step === 2 ? "bg-pine" : "bg-line"}`} />
        </div>
        {step === 1 ? (
          <div className="mt-8">
            <h1 className="font-serif text-4xl leading-none font-normal">What are you listing?</h1>
            <div className="mt-6 grid grid-cols-2 gap-2">
              {tiles.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={propertyType === type}
                  className={
                    propertyType === type
                      ? "border border-pine bg-pine-l px-4 py-5 text-left text-sm font-semibold"
                      : "border border-line bg-surface px-4 py-5 text-left text-sm"
                  }
                  onClick={() => setPropertyType(type)}
                >
                  {propertyTypeName(type)}
                </button>
              ))}
            </div>
            <label className="mt-6 grid gap-1">
              <span className={labelClass}>Location</span>
              <select className={fieldClass} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                {places.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="mt-8 rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white" onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        ) : (
          <div className="mt-8">
            <h1 className="font-serif text-4xl leading-none font-normal">How can we reach you?</h1>
            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className={labelClass}>First name</span>
                  <input
                    className={fieldClass}
                    autoComplete="given-name"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </label>
                <label className="grid gap-1">
                  <span className={labelClass}>Last name</span>
                  <input
                    className={fieldClass}
                    autoComplete="family-name"
                    placeholder="Doe"
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
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="grid gap-1">
                <span className={labelClass}>Phone</span>
                <input
                  className={fieldClass}
                  type="tel"
                  autoComplete="tel"
                  placeholder="555-555-0100"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
            </div>
            {error ? (
              <p className="mt-4 text-sm text-warn" role="alert">
                {error}{" "}
                {needsSignIn ? (
                  <Link href="/sign-in?next=%2Fowners%2Fstart" className="font-semibold text-pine">
                    Sign in
                  </Link>
                ) : null}
              </p>
            ) : null}
            <div className="mt-8 flex gap-4">
              <button
                type="button"
                disabled={pending}
                className="rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                onClick={() => void start()}
              >
                Continue
              </button>
              <button type="button" className="text-sm font-semibold text-muted" onClick={() => setStep(1)}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="relative min-h-[280px] bg-stone md:min-h-full">
        {step === 1 ? (
          <>
            <Image
              src="/demo/p1.jpg"
              alt="A dark modern ADU set among pines and rock"
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
            <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pt-10 pb-5 text-sm text-white">
              A dark modern ADU set among pines and rock
            </p>
          </>
        ) : (
          <Image
            src="/demo/p2.jpg"
            alt="A furnished bedroom"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        )}
      </div>
    </div>
  );
}
