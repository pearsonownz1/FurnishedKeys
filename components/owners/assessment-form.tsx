"use client";

import { submitOwnerLead } from "@/app/(site)/owners/actions";
import type { OwnerLeadActionState, OwnerLeadField } from "@/lib/leads";
import { readOwnerLeadForm, validateOwnerLead } from "@/lib/leads";
import { furnishedLevels, propertyTypes } from "@/lib/db/types";
import { useActionState, type ReactNode } from "react";

const empty: OwnerLeadActionState = { ok: false };

const typeLabels: Record<(typeof propertyTypes)[number], string> = {
  adu: "ADU",
  apartment: "Apartment",
  room: "Room",
  house: "House",
  other: "Other",
};

const furnishedLabels: Record<(typeof furnishedLevels)[number], string> = {
  yes: "Yes",
  partly: "Partly",
  no: "No",
};

const offeredTypes = ["adu", "apartment", "room", "house"] as const;

const currentUses = [
  "Vacant",
  "Long-term rental",
  "Short-term rental",
  "Family use",
  "Other",
] as const;

const interests = [
  { value: "list_myself", label: "Listing it myself" },
  { value: "full_management", label: "Full management" },
  { value: "not_sure", label: "Not sure" },
] as const;

export function AssessmentForm({ source }: { source: string }) {
  async function action(
    previous: OwnerLeadActionState,
    formData: FormData,
  ): Promise<OwnerLeadActionState> {
    const input = readOwnerLeadForm(formData);
    const local = validateOwnerLead(input);
    if (!local.ok) return { ok: false, fieldErrors: local.fieldErrors };
    return submitOwnerLead(previous, formData);
  }

  const [state, formAction, pending] = useActionState(action, empty);

  if (state.success) {
    return (
      <div className="bg-surface px-6 py-10 shadow-search sm:px-10" role="status">
        <p className="font-serif text-3xl leading-none">Request received</p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          We&apos;ll follow up by email about what it could rent for and how we&apos;d work together.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="bg-surface px-5 py-8 shadow-search sm:px-10 sm:py-10">
      {source ? <input type="hidden" name="source" value={source} /> : null}
      <div className="grid gap-5">
        <Field label="Property address" name="propertyAddress" error={state.fieldErrors?.propertyAddress}>
          <input
            id="propertyAddress"
            name="propertyAddress"
            type="text"
            autoComplete="street-address"
            placeholder="Street address"
            aria-invalid={Boolean(state.fieldErrors?.propertyAddress)}
            className="h-[46px] w-full bg-transparent text-base"
          />
        </Field>
        <Segment
          legend="Property type"
          name="propertyType"
          options={offeredTypes.map((value) => ({ value, label: typeLabels[value] }))}
          error={state.fieldErrors?.propertyType}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Segment
            legend="Furnished now?"
            name="furnished"
            options={furnishedLevels.map((value) => ({ value, label: furnishedLabels[value] }))}
            error={state.fieldErrors?.furnished}
          />
          <Field label="Current use" name="currentUse" error={state.fieldErrors?.currentUse}>
            <select
              id="currentUse"
              name="currentUse"
              defaultValue=""
              aria-invalid={Boolean(state.fieldErrors?.currentUse)}
              className="h-[46px] w-full bg-transparent text-base"
            >
              <option value="">Select current use</option>
              {currentUses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="When could it be available?" name="availableFrom" error={state.fieldErrors?.availableFrom}>
            <input
              id="availableFrom"
              name="availableFrom"
              type="date"
              aria-invalid={Boolean(state.fieldErrors?.availableFrom)}
              className="h-[46px] w-full bg-transparent text-base"
            />
          </Field>
          <Field label="Interested in" name="interest" error={state.fieldErrors?.interest}>
            <select
              id="interest"
              name="interest"
              defaultValue=""
              aria-invalid={Boolean(state.fieldErrors?.interest)}
              className="h-[46px] w-full bg-transparent text-base"
            >
              <option value="">Not sure yet…</option>
              {interests.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Name" name="name" error={state.fieldErrors?.name}>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              aria-invalid={Boolean(state.fieldErrors?.name)}
              className="h-[46px] w-full bg-transparent text-base"
            />
          </Field>
          <Field label="Email" name="email" error={state.fieldErrors?.email}>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(state.fieldErrors?.email)}
              className="h-[46px] w-full bg-transparent text-base"
            />
          </Field>
          <Field label="Phone" name="phone" error={state.fieldErrors?.phone}>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Optional"
              aria-invalid={Boolean(state.fieldErrors?.phone)}
              className="h-[46px] w-full bg-transparent text-base"
            />
          </Field>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[10px] tracking-[0.1em] text-muted uppercase">
            Anything else we should know?
          </span>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Optional"
            aria-invalid={Boolean(state.fieldErrors?.notes)}
            className="w-full border border-line px-3 py-2.5 text-base"
          />
          {state.fieldErrors?.notes ? (
            <span className="mt-1 block text-xs text-warn">{state.fieldErrors.notes}</span>
          ) : null}
        </label>
      </div>
      {state.formError ? (
        <p className="mt-4 text-sm text-warn" role="alert">
          {state.formError}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-xs leading-relaxed text-muted">
          We only publish a property after its owner submits and approves it. Listings shown
          during setup are marked as demos.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-[2px] bg-pine px-5 py-3.5 font-semibold text-white disabled:opacity-70"
        >
          {pending ? "Sending…" : "Request assessment"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: OwnerLeadField;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={name}>
      <span className="mb-1.5 block text-[10px] tracking-[0.1em] text-muted uppercase">
        {label}
      </span>
      <span className="block border border-line px-3">{children}</span>
      {error ? <span className="mt-1 block text-xs text-warn">{error}</span> : null}
    </label>
  );
}

function Segment({
  legend,
  name,
  options,
  error,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[10px] tracking-[0.1em] text-muted uppercase">{legend}</legend>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={legend}>
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input type="radio" name={name} value={option.value} className="peer sr-only" />
            <span className="inline-block rounded-[2px] border border-line px-3 py-2.5 text-sm peer-checked:border-pine peer-checked:bg-pine-l peer-checked:font-semibold peer-checked:text-pine-d">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error ? <span className="mt-1 block text-xs text-warn">{error}</span> : null}
    </fieldset>
  );
}
