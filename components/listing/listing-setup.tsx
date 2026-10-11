"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  reorderListingPhotos,
  saveListingFees,
  setListingCover,
} from "@/app/(site)/owners/listings/actions";
import { ListingPreview } from "@/components/listing/listing-preview";
import { StayCalendar } from "@/components/listing/stay-calendar";
import { createClient } from "@/lib/supabase/client";
import {
  bedChoices,
  bedsForRoom,
  calendarBody,
  feeRows,
  firstMissingStep,
  listingSteps,
  missingCount,
  missingLinks,
  toListingPatch,
  type BedroomDraft,
  type DraftPhoto,
  type ListingDraft,
  type ListingStepId,
} from "@/lib/listing-draft";
import { amenityCatalog, amenityGroups } from "@/lib/listings/amenities";
import { goodForCatalog } from "@/lib/listings/good-for";
import { MAX_LISTING_PHOTOS } from "@/lib/listings/setup";
import { LISTING_PHOTOS_BUCKET } from "@/lib/photos";
import type { PropertyType } from "@/lib/db/types";
import { propertyTypes } from "@/lib/db/types";
import { propertyTypeName } from "@/lib/property-display";

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";
const areaClass =
  "min-h-32 w-full rounded-[2px] border border-line bg-surface px-3 py-2 text-[15px]";

const propertyChoices = propertyTypes.filter((type) => type !== "other");

export function ListingSetup({
  listingId,
  initial,
  initialStep,
  placeLabel,
}: {
  listingId: string;
  initial: ListingDraft;
  initialStep: ListingStepId;
  placeLabel: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<ListingStepId>(initialStep);
  const [dirty, setDirty] = useState(false);
  const [calendarDirty, setCalendarDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function update(patch: Partial<ListingDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    if (
      "blockedDates" in patch ||
      "availableFrom" in patch ||
      "availableTo" in patch
    ) {
      setCalendarDirty(true);
    }
  }

  const persist = useCallback(
    async (current: ListingDraft, saveCalendar: boolean) => {
      setSaving(true);
      const response = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toListingPatch(current)),
      });
      const fees = await saveListingFees(listingId, feeRows(current, listingId));
      let calendarOk = true;
      let stamp: string | null = null;
      if (saveCalendar) {
        const calendar = await fetch(`/api/listings/${listingId}/calendar`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(calendarBody(current)),
        });
        calendarOk = calendar.ok;
        if (calendar.ok) {
          const body = (await calendar.json().catch(() => null)) as {
            calendar_updated_at?: string | null;
          } | null;
          if (typeof body?.calendar_updated_at === "string") stamp = body.calendar_updated_at;
        }
      }
      setSaving(false);
      if (!response.ok || !fees.ok || !calendarOk) {
        setSaved(false);
        setError("We couldn't save this draft. Your typing is still here.");
        return false;
      }
      setError(null);
      setDirty(false);
      if (saveCalendar) setCalendarDirty(false);
      setSaved(true);
      if (stamp) {
        // listing.bedrooms in the PATCH body is only a count. Keep the room rows.
        setDraft((existing) => ({ ...existing, calendarUpdatedAt: stamp, bedrooms: existing.bedrooms }));
      }
      return true;
    },
    [listingId],
  );

  useEffect(() => {
    if (!dirty && !calendarDirty) return;
    const current = draft;
    const saveCalendar = calendarDirty;
    const handle = setTimeout(() => {
      void persist(current, saveCalendar);
    }, 700);
    return () => clearTimeout(handle);
  }, [calendarDirty, dirty, draft, persist]);

  function go(next: ListingStepId) {
    setStep(next);
    router.replace(`/owners/listings/${listingId}/setup?step=${next}`);
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_LISTING_PHOTOS - draft.photos.length;
    if (room <= 0) {
      setError(`A listing can have at most ${MAX_LISTING_PHOTOS} photos.`);
      return;
    }
    const chosen = [...files].slice(0, room);
    setSaving(true);
    const response = await fetch(`/api/listings/${listingId}/photos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ files: chosen.map((file) => ({ name: file.name })) }),
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
      const file = chosen[index];
      if (!upload || !file) continue;
      const stored = await supabase.storage
        .from(LISTING_PHOTOS_BUCKET)
        .uploadToSignedUrl(upload.path, upload.token, file);
      if (stored.error) {
        setError(stored.error.message);
        continue;
      }
      const row = await supabase
        .from("listing_photos")
        .select("id")
        .eq("storage_path", upload.path)
        .maybeSingle();
      added.push({
        id: row.data?.id ?? upload.path,
        path: upload.path,
        url: URL.createObjectURL(file),
        isCover: false,
      });
    }
    setDraft((current) => ({ ...current, photos: [...current.photos, ...added] }));
    setSaving(false);
    setSaved(true);
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const next = draft.photos.slice();
    const target = index + direction;
    const item = next[index];
    if (!item || target < 0 || target >= next.length) return;
    next.splice(index, 1);
    next.splice(target, 0, item);
    update({ photos: next });
    void reorderListingPhotos(listingId, next.map((photo) => photo.path));
  }

  function markCover(photoId: string) {
    update({
      photos: draft.photos.map((photo) => ({ ...photo, isCover: photo.id === photoId })),
    });
    void setListingCover(listingId, photoId);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const savedDraft = await persist(draft, true);
    if (!savedDraft) {
      setSubmitting(false);
      return;
    }
    const response = await fetch(`/api/listings/${listingId}/submit`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      missing?: unknown;
    } | null;
    setSubmitting(false);
    if (response.ok) {
      setSubmitted(true);
      setMissing([]);
      return;
    }
    const fields = Array.isArray(body?.missing)
      ? body.missing.filter((item): item is string => typeof item === "string")
      : [];
    if (response.status === 422 && fields.length > 0) {
      setMissing(fields);
      const next = firstMissingStep(fields);
      if (next) go(next);
      return;
    }
    setError(body?.error ?? "We couldn't submit this listing. Please try again.");
  }

  if (submitted) {
    return (
      <div className="shell py-16">
        <h1 className="font-serif text-5xl leading-none font-normal">The listing is in review.</h1>
        <p className="mt-4 max-w-xl text-sm text-muted">
          We&apos;ll look at it before it goes live.
        </p>
        <button
          type="button"
          className="mt-8 text-sm font-semibold text-pine"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  const atPhotoCap = draft.photos.length >= MAX_LISTING_PHOTOS;
  const gaps = missingLinks(missing);

  return (
    <div className="shell py-8 lg:py-12">
      <div className="grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <div className="min-w-0 lg:sticky lg:top-6">
          <ol className="flex gap-3 overflow-x-auto pb-2 lg:block lg:overflow-visible lg:pb-0" aria-label="Listing steps">
            {listingSteps.map((item, index) => {
              const current = item.id === step;
              const badge = missingCount(missing, item.id);
              return (
                <li key={item.id} className="shrink-0 lg:border-t lg:border-line lg:py-3">
                  <button
                    type="button"
                    aria-current={current ? "step" : undefined}
                    onClick={() => go(item.id)}
                    className={
                      current
                        ? "text-left text-sm font-semibold text-pine"
                        : "text-left text-sm text-muted"
                    }
                  >
                    <span className="mr-2 font-serif text-lg italic">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                    {badge > 0 ? (
                      <span className="ml-2 inline-grid h-5 min-w-5 place-items-center rounded-[2px] bg-clay px-1 text-[11px] font-semibold text-white">
                        {badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 space-y-1 text-sm text-muted">
            <p>{saving ? "Saving draft…" : saved ? "Draft saved" : "Draft not saved"}</p>
          </div>
        </div>

        <div className="min-w-0">
          {error ? (
            <p className="mb-4 text-sm text-warn" role="alert">
              {error}
            </p>
          ) : null}
          {gaps.length > 0 ? (
            <ul className="mb-4 space-y-1 text-sm text-warn" role="alert">
              {gaps.map((gap) => (
                <li key={gap.field}>
                  <button type="button" className="underline" onClick={() => go(gap.step)}>
                    {gap.message}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <StepFields
            step={step}
            draft={draft}
            update={update}
            atPhotoCap={atPhotoCap}
            onPhotos={(files) => void uploadPhotos(files)}
            onMove={movePhoto}
            onCover={markCover}
            onContinue={() => {
              const index = listingSteps.findIndex((item) => item.id === step);
              const next = listingSteps[index + 1];
              if (next) go(next.id);
            }}
            onEdit={go}
            onSubmit={() => void submit()}
            submitting={submitting}
          />
        </div>

        <ListingPreview draft={draft} step={step} placeLabel={placeLabel} />
      </div>
    </div>
  );
}

function StepFields({
  step,
  draft,
  update,
  atPhotoCap,
  onPhotos,
  onMove,
  onCover,
  onContinue,
  onEdit,
  onSubmit,
  submitting,
}: {
  step: ListingStepId;
  draft: ListingDraft;
  update: (patch: Partial<ListingDraft>) => void;
  atPhotoCap: boolean;
  onPhotos: (files: FileList | null) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onCover: (photoId: string) => void;
  onContinue: () => void;
  onEdit: (step: ListingStepId) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  if (step === "basics") {
    return (
      <fieldset className="grid gap-4">
        <legend className="font-serif text-4xl leading-none font-normal">Basics</legend>
        <label className="grid gap-1 text-sm">
          Title
          <input className={fieldClass} value={draft.title} onChange={(event) => update({ title: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          Property type
          <select
            className={fieldClass}
            value={draft.propertyType}
            onChange={(event) => update({ propertyType: event.target.value as PropertyType })}
          >
            {propertyChoices.map((type) => (
              <option key={type} value={type}>
                {propertyTypeName(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Address
          <input className={fieldClass} value={draft.address} onChange={(event) => update({ address: event.target.value })} />
        </label>
        <p className="text-sm text-muted">Private. The public sees only an approximate pin.</p>
        <Continue onClick={onContinue} />
      </fieldset>
    );
  }

  if (step === "rooms") {
    return (
      <div className="grid gap-4">
        <h1 className="font-serif text-4xl leading-none font-normal">Rooms</h1>
        {draft.bedrooms.map((room, index) => (
          <BedroomCard
            key={room.key}
            room={room}
            onChange={(next) => {
              const bedrooms = draft.bedrooms.slice();
              bedrooms[index] = next;
              update({ bedrooms });
            }}
            onRemove={() => update({ bedrooms: draft.bedrooms.filter((item) => item.key !== room.key) })}
          />
        ))}
        <button
          type="button"
          className="justify-self-start text-sm font-semibold text-pine"
          onClick={() =>
            update({
              bedrooms: [
                ...draft.bedrooms,
                {
                  key: crypto.randomUUID(),
                  label: `Bedroom ${draft.bedrooms.length + 1}`,
                  bedType: "",
                  bunkCount: "",
                  bedsText: "",
                },
              ],
            })
          }
        >
          + Add a bedroom
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm">Bathrooms</span>
          <button type="button" className="h-10 w-10 border border-line" aria-label="Fewer bathrooms" onClick={() => update({ bathrooms: stepBathrooms(draft.bathrooms, -0.5) })}>
            −
          </button>
          <span className="min-w-8 text-center text-sm">{draft.bathrooms || "0"}</span>
          <button type="button" className="h-10 w-10 border border-line" aria-label="More bathrooms" onClick={() => update({ bathrooms: stepBathrooms(draft.bathrooms, 0.5) })}>
            +
          </button>
        </div>
        <label className="grid gap-1 text-sm">
          Square feet
          <input
            className={fieldClass}
            inputMode="numeric"
            value={draft.squareFeet}
            onChange={(event) => update({ squareFeet: event.target.value.replace(/[^\d]/g, "") })}
          />
        </label>
        <Continue onClick={onContinue} />
      </div>
    );
  }

  if (step === "photos") {
    return (
      <div className="grid gap-4">
        <h1 className="font-serif text-4xl leading-none font-normal">Photos</h1>
        <p className="text-sm text-muted">
          {draft.photos.length} of {MAX_LISTING_PHOTOS}. The first photo is the cover if you don&apos;t pick one.
        </p>
        <ul className="grid gap-3">
          {draft.photos.map((photo, index) => (
            <li key={photo.id} className="flex items-center gap-3 border border-line bg-surface p-2">
              <div className="relative h-16 w-20 shrink-0 bg-stone">
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button type="button" aria-pressed={photo.isCover} className={photo.isCover ? "font-semibold text-pine" : ""} onClick={() => onCover(photo.id)}>
                  Cover
                </button>
                <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}>
                  Up
                </button>
                <button type="button" onClick={() => onMove(index, 1)} disabled={index === draft.photos.length - 1}>
                  Down
                </button>
              </div>
            </li>
          ))}
        </ul>
        <label className="text-sm font-semibold text-pine">
          {atPhotoCap ? `A listing can have at most ${MAX_LISTING_PHOTOS} photos.` : "Add photos"}
          <input
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            disabled={atPhotoCap}
            onChange={(event) => {
              onPhotos(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <Continue onClick={onContinue} />
      </div>
    );
  }

  if (step === "description") {
    return (
      <div className="grid gap-4">
        <h1 className="font-serif text-4xl leading-none font-normal">Description</h1>
        <label className="grid gap-1 text-sm">
          Summary
          <textarea className={areaClass} value={draft.summary} onChange={(event) => update({ summary: event.target.value })} />
        </label>
        <label className="grid gap-1 text-sm">
          The space
          <textarea className={areaClass} value={draft.space} onChange={(event) => update({ space: event.target.value })} />
        </label>
        <Continue onClick={onContinue} />
      </div>
    );
  }

  if (step === "goodFor") {
    return (
      <div className="grid gap-4">
        <h1 className="font-serif text-4xl leading-none font-normal">Good for</h1>
        <ul className="flex flex-wrap gap-2">
          {goodForCatalog.map((tag) => {
            const on = draft.goodFor.includes(tag.key);
            return (
              <li key={tag.key}>
                <button
                  type="button"
                  aria-pressed={on}
                  className={
                    on
                      ? "rounded-[2px] border border-pine bg-pine-l px-3 py-2 text-sm"
                      : "rounded-[2px] border border-line bg-surface px-3 py-2 text-sm"
                  }
                  onClick={() =>
                    update({
                      goodFor: on
                        ? draft.goodFor.filter((key) => key !== tag.key)
                        : [...draft.goodFor, tag.key],
                    })
                  }
                >
                  {tag.label}
                </button>
              </li>
            );
          })}
        </ul>
        <Continue onClick={onContinue} />
      </div>
    );
  }

  if (step === "amenities") {
    return (
      <div className="grid gap-6">
        <h1 className="font-serif text-4xl leading-none font-normal">Amenities</h1>
        {amenityGroups.map((group) => (
          <fieldset key={group} className="grid gap-2">
            <legend className="text-sm font-semibold">{group}</legend>
            {amenityCatalog
              .filter((item) => item.group === group)
              .map((item) => (
                <label key={item.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.amenities.includes(item.key)}
                    onChange={(event) =>
                      update({
                        amenities: event.target.checked
                          ? [...draft.amenities, item.key]
                          : draft.amenities.filter((key) => key !== item.key),
                      })
                    }
                  />
                  {item.label}
                </label>
              ))}
          </fieldset>
        ))}
        <Continue onClick={onContinue} />
      </div>
    );
  }

  if (step === "rent") {
    return (
      <div className="grid gap-4">
        <h1 className="font-serif text-4xl leading-none font-normal">Rent & fees</h1>
        <label className="grid gap-1 text-sm">
          Monthly rent
          <input className={fieldClass} inputMode="decimal" value={draft.monthlyRent} onChange={(event) => update({ monthlyRent: event.target.value })} />
        </label>
        {draft.fees.map((fee) => (
          <label key={fee.kind} className="grid gap-1 text-sm">
            {fee.label}
            <input
              className={fieldClass}
              inputMode="decimal"
              value={fee.amount}
              onChange={(event) =>
                update({
                  fees: draft.fees.map((row) =>
                    row.kind === fee.kind ? { ...row, amount: event.target.value } : row,
                  ),
                })
              }
            />
          </label>
        ))}
        <Continue onClick={onContinue} />
      </div>
    );
  }

  if (step === "availability") {
    return (
      <div className="grid gap-4">
        <h1 className="font-serif text-4xl leading-none font-normal">Availability</h1>
        <label className="grid gap-1 text-sm">
          Minimum stay (months)
          <input className={fieldClass} inputMode="numeric" value={draft.minStay} onChange={(event) => update({ minStay: event.target.value.replace(/[^\d]/g, "") })} />
        </label>
        <label className="grid gap-1 text-sm">
          Available from
          <input className={fieldClass} type="date" value={draft.availableFrom} onChange={(event) => update({ availableFrom: event.target.value })} />
        </label>
        <StayCalendar
          blocked={draft.blockedDates}
          marked={draft.availableFrom}
          onToggle={(iso) =>
            update({
              blockedDates: draft.blockedDates.includes(iso)
                ? draft.blockedDates.filter((date) => date !== iso)
                : [...draft.blockedDates, iso],
            })
          }
        />
        <p className="text-sm text-muted">Saving stamps “Calendar updated today.”</p>
        <Continue onClick={onContinue} />
      </div>
    );
  }

  if (step === "rules") {
    return (
      <div className="grid gap-4">
        <h1 className="font-serif text-4xl leading-none font-normal">House rules</h1>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.petsAllowed} onChange={(event) => update({ petsAllowed: event.target.checked })} />
          Pets allowed
        </label>
        <label className="grid gap-1 text-sm">
          Pet note
          <input className={fieldClass} value={draft.petPolicy} onChange={(event) => update({ petPolicy: event.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.noSmoking} onChange={(event) => update({ noSmoking: event.target.checked })} />
          No smoking
        </label>
        <label className="grid gap-1 text-sm">
          Other rules
          <textarea className={areaClass} value={draft.houseRules} onChange={(event) => update({ houseRules: event.target.value })} />
        </label>
        <Continue onClick={onContinue} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <h1 className="font-serif text-4xl leading-none font-normal">Review</h1>
      <ul className="divide-y divide-line border-y border-line text-sm">
        {listingSteps.slice(0, -1).map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-3">
            <span>{item.label}</span>
            <button type="button" className="font-semibold text-pine" onClick={() => onEdit(item.id)}>
              Edit
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={submitting}
        onClick={onSubmit}
        className="justify-self-start rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        Submit for review
      </button>
    </div>
  );
}

function BedroomCard({
  room,
  onChange,
  onRemove,
}: {
  room: BedroomDraft;
  onChange: (room: BedroomDraft) => void;
  onRemove: () => void;
}) {
  const beds = bedsForRoom(room);
  return (
    <div className="grid gap-3 border border-line bg-surface p-4">
      <label className="grid gap-1 text-sm">
        Bedroom
        <input className={fieldClass} value={room.label} onChange={(event) => onChange({ ...room, label: event.target.value })} />
      </label>
      <label className="grid gap-1 text-sm">
        Bed type
        <select
          className={fieldClass}
          value={room.bedType}
          onChange={(event) =>
            onChange({
              ...room,
              bedType: event.target.value as BedroomDraft["bedType"],
              bedsText: "",
            })
          }
        >
          <option value="">Bed type</option>
          {bedChoices.map((choice) => (
            <option key={choice.id} value={choice.id}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
      {room.bedType === "bunk" ? (
        <label className="grid gap-1 text-sm">
          Bunk count
          <input
            className={fieldClass}
            inputMode="numeric"
            value={room.bunkCount}
            onChange={(event) => onChange({ ...room, bunkCount: event.target.value.replace(/[^\d]/g, ""), bedsText: "" })}
          />
        </label>
      ) : null}
      {room.bedType === "" && room.bedsText ? <p className="text-sm text-muted">{beds}</p> : null}
      <button type="button" className="justify-self-start text-sm text-muted" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function stepBathrooms(current: string, delta: number): string {
  const value = Number(current || "0") + delta;
  const next = Math.max(0, Math.round(value * 2) / 2);
  return next === 0 ? "" : String(next);
}

function Continue({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-2 justify-self-start rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white">
      Continue
    </button>
  );
}
