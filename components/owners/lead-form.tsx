"use client";

import { submitOwnerLead } from "@/app/(site)/owners/actions";
import type { OwnerLeadActionState, OwnerLeadField } from "@/lib/leads";
import { readOwnerLeadForm, validateOwnerLead } from "@/lib/leads";
import { activeLocations } from "@/lib/locations";
import { furnishedLevels, ownerLeadInterests, propertyTypes } from "@/lib/db/types";
import { useActionState, type ReactNode } from "react";

const empty: OwnerLeadActionState = { ok: false };

const interestLabels: Record<(typeof ownerLeadInterests)[number], string> = {
  list_myself: "List it myself",
  full_management: "Full management",
  not_sure: "Not sure",
};

const typeLabels: Record<(typeof propertyTypes)[number], string> = {
  adu: "ADU",
  apartment: "Apartment",
  room: "Room",
  house: "House",
  other: "Other",
};

const furnishedLabels: Record<(typeof furnishedLevels)[number], string> = {
  yes: "Furnished",
  partly: "Partly furnished",
  no: "Unfurnished",
};

export function LeadForm({ source }: { source: string }) {
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
  const places = activeLocations();

  if (state.success) {
    return (
      <div className="rounded-[4px] border border-line bg-surface p-6" role="status">
        <p className="text-lg font-semibold">Assessment requested</p>
        <p className="mt-2 text-sm text-muted">
          You won&apos;t be charged. We&apos;ll reply by email.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4">
      {source ? <input type="hidden" name="source" value={source} /> : null}
      <Field label="Interested in" name="interest" error={state.fieldErrors?.interest}>
        <select
          id="interest"
          name="interest"
          defaultValue=""
          aria-invalid={Boolean(state.fieldErrors?.interest)}
          className="w-full bg-transparent text-sm"
        >
          <option value="">Skip for now</option>
          {ownerLeadInterests.map((value) => (
            <option key={value} value={value}>
              {interestLabels[value]}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" error={state.fieldErrors?.name}>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(state.fieldErrors?.name)}
            className="w-full bg-transparent text-sm"
          />
        </Field>
        <Field label="Email" name="email" error={state.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(state.fieldErrors?.email)}
            className="w-full bg-transparent text-sm"
          />
        </Field>
        <Field label="Phone" name="phone" error={state.fieldErrors?.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(state.fieldErrors?.phone)}
            className="w-full bg-transparent text-sm"
          />
        </Field>
        <Field label="Property type" name="propertyType" error={state.fieldErrors?.propertyType}>
          <select
            id="propertyType"
            name="propertyType"
            defaultValue=""
            aria-invalid={Boolean(state.fieldErrors?.propertyType)}
            className="w-full bg-transparent text-sm"
          >
            <option value="">Optional</option>
            {propertyTypes.map((value) => (
              <option key={value} value={value}>
                {typeLabels[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Furnished" name="furnished" error={state.fieldErrors?.furnished}>
          <select
            id="furnished"
            name="furnished"
            defaultValue=""
            aria-invalid={Boolean(state.fieldErrors?.furnished)}
            className="w-full bg-transparent text-sm"
          >
            <option value="">Optional</option>
            {furnishedLevels.map((value) => (
              <option key={value} value={value}>
                {furnishedLabels[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location" name="locationId" error={state.fieldErrors?.locationId}>
          <select
            id="locationId"
            name="locationId"
            defaultValue=""
            aria-invalid={Boolean(state.fieldErrors?.locationId)}
            className="w-full bg-transparent text-sm"
          >
            <option value="">Optional</option>
            {places.map((place) => (
              <option key={place.id} value={place.id}>
                {place.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Property address" name="propertyAddress" error={state.fieldErrors?.propertyAddress}>
        <input
          id="propertyAddress"
          name="propertyAddress"
          type="text"
          autoComplete="street-address"
          aria-invalid={Boolean(state.fieldErrors?.propertyAddress)}
          className="w-full bg-transparent text-sm"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Current use" name="currentUse" error={state.fieldErrors?.currentUse}>
          <input
            id="currentUse"
            name="currentUse"
            type="text"
            aria-invalid={Boolean(state.fieldErrors?.currentUse)}
            className="w-full bg-transparent text-sm"
          />
        </Field>
        <Field label="Available from" name="availableFrom" error={state.fieldErrors?.availableFrom}>
          <input
            id="availableFrom"
            name="availableFrom"
            type="date"
            aria-invalid={Boolean(state.fieldErrors?.availableFrom)}
            className="w-full bg-transparent text-sm"
          />
        </Field>
      </div>
      <label className="block">
        <span className="mb-1 block text-[10px] tracking-[0.1em] text-muted uppercase">
          Notes
        </span>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          aria-invalid={Boolean(state.fieldErrors?.notes)}
          className="w-full rounded-[2px] border border-line bg-surface px-3 py-2.5 text-sm"
        />
        {state.fieldErrors?.notes ? (
          <span className="mt-1 block text-xs text-warn">{state.fieldErrors.notes}</span>
        ) : null}
      </label>
      {state.formError ? (
        <p className="text-sm text-warn" role="alert">
          {state.formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[2px] bg-pine px-5 py-3.5 font-semibold text-white disabled:opacity-70"
      >
        {pending ? "Sending…" : "Request an assessment"}
      </button>
      <p className="text-xs text-muted">You won&apos;t be charged. We&apos;ll reply by email.</p>
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
      <span className="mb-1 block text-[10px] tracking-[0.1em] text-muted uppercase">
        {label}
      </span>
      <span className="block rounded-[2px] border border-line bg-surface px-3 py-2.5">
        {children}
      </span>
      {error ? <span className="mt-1 block text-xs text-warn">{error}</span> : null}
    </label>
  );
}
