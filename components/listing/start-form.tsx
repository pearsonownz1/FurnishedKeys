"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PropertyType } from "@/lib/db/types";
import { propertyTypeName } from "@/lib/property-display";

const tiles = ["adu", "apartment", "room", "house"] as const satisfies readonly PropertyType[];

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start() {
    if (!fullName.trim() || !email.trim() || phone.trim().length < 7) {
      setError("Add your name, email, and phone.");
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch("/api/owners/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
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
      setError(body?.error ?? "We couldn't start this listing. Please try again.");
      return;
    }
    router.push(`/owners/listings/${body.listing_id}/plan`);
  }

  return (
    <div className="grid items-stretch md:grid-cols-2">
      <div className="px-5 py-10 md:px-10 lg:py-16 lg:pr-16 lg:pl-[max(1.25rem,calc((100vw-1200px)/2))]">
        <p className="text-xs tracking-[0.14em] text-muted uppercase">List a property</p>
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
            <label className="mt-6 grid gap-1 text-sm">
              Location
              <select className={fieldClass} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.label}
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
              <label className="grid gap-1 text-sm">
                Name
                <input className={fieldClass} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                Email
                <input className={fieldClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                Phone
                <input className={fieldClass} type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </label>
            </div>
            {error ? (
              <p className="mt-4 text-sm text-warn" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-8 flex gap-4">
              <button type="button" className="text-sm font-semibold text-muted" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                onClick={() => void start()}
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="relative min-h-[240px] bg-stone md:min-h-full">
        <Image src="/demo/p1.jpg" alt="A furnished room" fill priority className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
      </div>
    </div>
  );
}
