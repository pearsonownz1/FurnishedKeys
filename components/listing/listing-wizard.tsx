"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { saveListingFees } from "@/app/(site)/owners/listings/actions";
import { createClient } from "@/lib/supabase/client";
import {
  amenityChoices,
  dollarsToCents,
  emptyDraft,
  feeRows,
  isListingStep,
  listingSteps,
  toListingPatch,
  type DraftPhoto,
  type ListingDraft,
  type ListingStepId,
} from "@/lib/listing-draft";
import { formatCents } from "@/lib/money";
import { LISTING_PHOTOS_BUCKET } from "@/lib/photos";
import { listingFeeAmount, listingFeePerYear } from "@/lib/pricing";

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

export function ListingWizard({
  listingId,
  locationId,
  initial,
  initialStep,
}: {
  listingId: string | null;
  locationId: string;
  initial: ListingDraft;
  initialStep: ListingStepId;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<ListingStepId>(initialStep);
  const [id, setId] = useState(listingId);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<ListingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  }

  const persist = useCallback(async (listing: string, current: ListingDraft) => {
    setSaving(true);
    const response = await fetch(`/api/listings/${listing}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toListingPatch(current)),
    });
    const fees = await saveListingFees(listing, feeRows(current, listing));
    setSaving(false);
    setDirty(false);
    if (!response.ok || !fees.ok) {
      setError("We couldn't save this draft. Your typing is still here.");
      return;
    }
    setError(null);
  }, []);

  useEffect(() => {
    if (!dirty || !id) return;
    const current = draft;
    const listing = id;
    const handle = setTimeout(() => {
      void persist(listing, current);
    }, 700);
    return () => clearTimeout(handle);
  }, [dirty, draft, id, persist]);

  async function startIfNeeded(): Promise<string | null> {
    if (id) return id;
    if (!draft.fullName.trim() || !draft.email.trim() || draft.phone.trim().length < 7) {
      setError("Add your name, email, and phone to start the draft.");
      return null;
    }
    setSaving(true);
    const response = await fetch("/api/owners/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: draft.fullName.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        property_type: draft.propertyType,
        location_id: locationId,
      }),
    });
    const body = (await response.json().catch(() => null)) as { listing_id?: string; error?: string } | null;
    if (!response.ok || !body?.listing_id) {
      setSaving(false);
      setError(body?.error ?? "We couldn't start this listing. Please try again.");
      return null;
    }
    const nextId = body.listing_id;
    const saved = await fetch(`/api/listings/${nextId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toListingPatch(draft)),
    });
    await saveListingFees(nextId, feeRows(draft, nextId));
    setSaving(false);
    if (!saved.ok) {
      setError("We couldn't save this draft. Your typing is still here.");
      return null;
    }
    setId(nextId);
    setDirty(false);
    router.replace(`/owners/listings/${nextId}?step=${step}`);
    return nextId;
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const listing = await startIfNeeded();
    if (!listing) return;
    setSaving(true);
    const response = await fetch(`/api/listings/${listing}/photos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files: [...files].map((file) => ({ name: file.name })) }),
    });
    const body = (await response.json().catch(() => null)) as {
      uploads?: { path: string; token: string }[];
      error?: string;
    } | null;
    if (!response.ok || !body?.uploads) {
      setSaving(false);
      setError(body?.error ?? "We couldn't upload those photos. Please try again.");
      return;
    }
    const supabase = createClient();
    const added: DraftPhoto[] = [];
    for (let index = 0; index < body.uploads.length; index += 1) {
      const upload = body.uploads[index];
      const file = files[index];
      if (!upload || !file) continue;
      const stored = await supabase.storage
        .from(LISTING_PHOTOS_BUCKET)
        .uploadToSignedUrl(upload.path, upload.token, file);
      if (stored.error) {
        setError(stored.error.message);
        continue;
      }
      added.push({ id: upload.path, path: upload.path, url: null });
    }
    setDraft((current) => ({ ...current, photos: [...current.photos, ...added] }));
    setSaving(false);
  }

  return (
    <div className="shell py-10 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
        <ol className="flex gap-2 overflow-x-auto lg:block lg:overflow-visible">
          {listingSteps.map((item, index) => {
            const current = item.id === step;
            return (
              <li key={item.id} className="shrink-0 lg:border-t lg:border-line lg:py-3">
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => setStep(item.id)}
                  className={current ? "text-left text-sm font-semibold text-pine" : "text-left text-sm text-muted"}
                >
                  <span className="mr-2 font-serif text-lg italic">{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </button>
              </li>
            );
          })}
        </ol>
        <div>
          <p className="text-xs text-muted">{saving ? "Saving draft…" : "Drafts save as you go."}</p>
          {error ? (
            <p className="mt-3 text-sm text-warn" role="alert">
              {error}
            </p>
          ) : null}
          <div className={step === "review" ? "mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]" : "mt-6"}>
            <StepForm
              step={step}
              draft={draft}
              update={update}
              onStep={setStep}
              onPhotos={(files) => void uploadPhotos(files)}
              onContinue={() => {
                const index = listingSteps.findIndex((item) => item.id === step);
                const next = listingSteps[index + 1];
                if (next) setStep(next.id);
                if (!id) void startIfNeeded();
              }}
              listingId={id}
            />
            {step === "review" ? <RenterPreview draft={draft} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepForm({
  step,
  draft,
  update,
  onPhotos,
  onContinue,
  onStep,
  listingId,
}: {
  step: ListingStepId;
  draft: ListingDraft;
  update: (patch: Partial<ListingDraft>) => void;
  onPhotos: (files: FileList | null) => void;
  onContinue: () => void;
  onStep: (step: ListingStepId) => void;
  listingId: string | null;
}) {
  if (step === "basics") {
    return (
      <fieldset className="grid gap-4">
        <legend className="font-serif text-4xl leading-none font-normal">Basics</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            Name
            <input className={fieldClass} value={draft.fullName} onChange={(event) => update({ fullName: event.target.value })} />
          </label>
          <label className="block text-sm">
            Email
            <input type="email" className={fieldClass} value={draft.email} onChange={(event) => update({ email: event.target.value })} />
          </label>
          <label className="block text-sm">
            Phone
            <input className={fieldClass} value={draft.phone} onChange={(event) => update({ phone: event.target.value })} />
          </label>
        </div>
        <label className="block text-sm">
          Property type
          <select
            className={fieldClass}
            value={draft.propertyType}
            onChange={(event) => update({ propertyType: event.target.value as ListingDraft["propertyType"] })}
          >
            <option value="adu">ADU</option>
            <option value="apartment">Apartment</option>
            <option value="room">Room</option>
            <option value="house">House</option>
          </select>
        </label>
        <label className="block text-sm">
          Title
          <input className={fieldClass} value={draft.title} onChange={(event) => update({ title: event.target.value })} />
        </label>
        <label className="block text-sm">
          Description
          <textarea className="min-h-28 w-full rounded-[2px] border border-line px-3 py-2 text-[15px]" value={draft.description} onChange={(event) => update({ description: event.target.value })} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            Bedrooms
            <input className={fieldClass} inputMode="numeric" value={draft.bedrooms} onChange={(event) => update({ bedrooms: event.target.value })} />
          </label>
          <label className="block text-sm">
            Bathrooms
            <input className={fieldClass} inputMode="decimal" value={draft.bathrooms} onChange={(event) => update({ bathrooms: event.target.value })} />
          </label>
          <label className="block text-sm">
            Sleeps
            <input className={fieldClass} inputMode="numeric" value={draft.maxOccupants} onChange={(event) => update({ maxOccupants: event.target.value })} />
          </label>
        </div>
        <label className="block text-sm">
          Street address
          <input className={fieldClass} value={draft.address} onChange={(event) => update({ address: event.target.value })} placeholder="Shown to you and admins only" />
        </label>
        <Continue onClick={onContinue} />
      </fieldset>
    );
  }

  if (step === "photos") {
    return (
      <fieldset>
        <legend className="font-serif text-4xl leading-none font-normal">Photos</legend>
        <p className="mt-3 text-sm text-muted">Photos stay in a private bucket until the listing is approved.</p>
        <input
          className="mt-5 block text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={(event) => onPhotos(event.target.files)}
        />
        <ul className="mt-4 text-sm">
          {draft.photos.map((photo) => (
            <li key={photo.id} className="border-t border-line py-2">
              {photo.path.split("/").pop()}
            </li>
          ))}
        </ul>
        <Continue onClick={onContinue} />
      </fieldset>
    );
  }

  if (step === "rent") {
    return (
      <fieldset className="grid gap-4">
        <legend className="font-serif text-4xl leading-none font-normal">Rent & fees</legend>
        <label className="block text-sm">
          Monthly rent
          <input className={fieldClass} inputMode="decimal" value={draft.monthlyRent} onChange={(event) => update({ monthlyRent: event.target.value })} />
        </label>
        {draft.fees.map((fee, index) => (
          <label key={fee.kind} className="block text-sm">
            {fee.label}
            <input
              className={fieldClass}
              inputMode="decimal"
              value={fee.amount}
              onChange={(event) => {
                const fees = draft.fees.map((row, rowIndex) =>
                  rowIndex === index ? { ...row, amount: event.target.value } : row,
                );
                update({ fees });
              }}
            />
          </label>
        ))}
        <Continue onClick={onContinue} />
      </fieldset>
    );
  }

  if (step === "availability") {
    return (
      <fieldset className="grid gap-4">
        <legend className="font-serif text-4xl leading-none font-normal">Availability</legend>
        <label className="block text-sm">
          Available from
          <input type="date" className={fieldClass} value={draft.availableFrom} onChange={(event) => update({ availableFrom: event.target.value })} />
        </label>
        <label className="block text-sm">
          Available to
          <input type="date" className={fieldClass} value={draft.availableTo} onChange={(event) => update({ availableTo: event.target.value })} />
        </label>
        <Continue onClick={onContinue} />
      </fieldset>
    );
  }

  if (step === "rules") {
    return (
      <fieldset className="grid gap-4">
        <legend className="font-serif text-4xl leading-none font-normal">House rules</legend>
        <textarea className="min-h-28 w-full rounded-[2px] border border-line px-3 py-2 text-[15px]" value={draft.houseRules} onChange={(event) => update({ houseRules: event.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.petsAllowed} onChange={(event) => update({ petsAllowed: event.target.checked })} />
          Pets allowed
        </label>
        <label className="block text-sm">
          Pet policy
          <input className={fieldClass} value={draft.petPolicy} onChange={(event) => update({ petPolicy: event.target.value })} />
        </label>
        <ul className="grid gap-2">
          {amenityChoices.map((amenity) => (
            <li key={amenity}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.amenities.includes(amenity)}
                  onChange={(event) => {
                    const amenities = event.target.checked
                      ? [...draft.amenities, amenity]
                      : draft.amenities.filter((item) => item !== amenity);
                    update({ amenities });
                  }}
                />
                {amenity}
              </label>
            </li>
          ))}
        </ul>
        <Continue onClick={onContinue} />
      </fieldset>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-4xl leading-none font-normal">Review & pay</h2>
      <ul className="mt-6">
        {listingSteps.slice(0, 5).map((item) => (
          <li key={item.id} className="flex items-center justify-between border-t border-line py-3 text-sm">
            <span>{item.label}</span>
            <button type="button" className="font-semibold text-pine" onClick={() => onStep(item.id)}>
              Edit
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-8 border border-line bg-surface px-5 py-5">
        <p className="font-serif text-5xl leading-none text-pine">{listingFeeAmount()}</p>
        <p className="mt-1 text-sm text-muted">/year</p>
        <p className="mt-4 text-sm leading-relaxed">{"If we can't approve it, you get a full refund."}</p>
        <p className="mt-1 text-sm text-muted">{listingFeePerYear()} for this listing.</p>
      </div>
      {listingId ? (
        <Link
          href={`/owners/listings/${listingId}/checkout`}
          className="mt-6 inline-block rounded-[2px] bg-pine px-5 py-3.5 text-[15px] font-semibold text-white"
        >
          Pay {listingFeePerYear()} and submit
        </Link>
      ) : (
        <button type="button" onClick={onContinue} className="mt-6 rounded-[2px] bg-pine px-5 py-3.5 text-[15px] font-semibold text-white">
          Pay {listingFeePerYear()} and submit
        </button>
      )}
    </div>
  );
}

function Continue({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 w-fit rounded-[2px] bg-pine px-4 py-3 text-sm font-semibold text-white">
      Continue
    </button>
  );
}

function RenterPreview({ draft }: { draft: ListingDraft }) {
  const rent = dollarsToCents(draft.monthlyRent);
  return (
    <aside className="h-fit border border-line bg-surface px-5 py-5">
      <h2 className="text-sm font-semibold">What renters will see</h2>
      <p className="mt-3 text-lg font-semibold">{draft.title.trim() || "Untitled listing"}</p>
      <p className="mt-1 text-sm text-muted">
        {draft.propertyType === "adu" ? "ADU" : draft.propertyType[0]?.toUpperCase() + draft.propertyType.slice(1)}
        {draft.bedrooms ? ` · ${draft.bedrooms} bed` : ""}
      </p>
      <p className="mt-3 text-[22px] font-semibold">
        {rent == null ? "Rent not set" : formatCents(rent)}
        <span className="ml-1 text-sm font-normal text-muted">/ month</span>
      </p>
      <ul className="mt-3 space-y-1 text-sm text-muted">
        {draft.fees.map((fee) => {
          const cents = dollarsToCents(fee.amount);
          if (cents == null) return null;
          return (
            <li key={fee.kind}>
              {fee.label} {formatCents(cents)}
            </li>
          );
        })}
      </ul>
      {draft.houseRules ? <p className="mt-3 text-sm leading-relaxed">{draft.houseRules}</p> : null}
      <p className="mt-4 text-xs text-muted">The street address is not on this card.</p>
    </aside>
  );
}

export function stepFromQuery(value: string | undefined): ListingStepId {
  return isListingStep(value) ? value : "basics";
}

export function blankDraft(): ListingDraft {
  return emptyDraft();
}
