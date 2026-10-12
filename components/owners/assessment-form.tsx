"use client";

import { submitOwnerLead } from "@/app/(site)/owners/actions";
import { assessmentCalendlyUrl } from "@/lib/calendly";
import type { OwnerLeadActionState, OwnerLeadField } from "@/lib/leads";
import { readOwnerLeadForm, validateOwnerLead } from "@/lib/leads";
import { furnishedLevels, propertyTypes } from "@/lib/db/types";
import Script from "next/script";
import { useActionState, useCallback, useEffect, useRef, type ReactNode } from "react";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (options: { url: string; parentElement: HTMLElement }) => void;
    };
  }
}

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
    const result = await submitOwnerLead(previous, formData);
    if (!result.success) return result;
    return { ...result, name: input.name, email: input.email };
  }

  const [state, formAction, pending] = useActionState(action, empty);

  if (state.success) {
    const url = assessmentCalendlyUrl({
      name: state.name,
      email: state.email,
      campaign: source,
    });
    return (
      <div className="min-w-0 lg:my-12 lg:pr-[max(1.25rem,calc((100vw-1200px)/2))]">
        <div className="bg-surface px-3 py-6 shadow-search sm:p-6 md:p-10" role="status">
          <p className="font-serif text-3xl leading-none">Request received</p>
          <h3 className="mt-3 font-serif text-[1.75rem] leading-snug font-normal">
            We&apos;ll follow up by email. Want to talk sooner? Pick a 30-minute call with Lindsey.
          </h3>
          <CalendlyInline url={url} />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="w-full bg-surface p-6 shadow-search md:p-10 lg:my-12 lg:mr-[120px]">
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
              <option value="">Vacant...</option>
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
              type="text"
              placeholder="e.g. December 1"
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
              <option value="">Not sure yet...</option>
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
            className="w-full rounded-[2px] border border-line px-3 py-2.5 text-base"
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

function CalendlyInline({ url }: { url: string }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const mount = useCallback(() => {
    const parent = parentRef.current;
    if (!parent || initialized.current) return;
    if (parent.querySelector("iframe")) {
      initialized.current = true;
      return;
    }
    const calendly = window.Calendly;
    if (!calendly?.initInlineWidget) return;
    initialized.current = true;
    calendly.initInlineWidget({ url, parentElement: parent });
  }, [url]);

  useEffect(() => {
    mount();
  }, [mount]);

  return (
    <>
      <div
        ref={parentRef}
        className="calendly-inline-widget mt-5 w-full"
        data-url={url}
        style={{ minWidth: 320, height: 700 }}
      />
      <Script
        id="calendly-widget"
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onLoad={mount}
        onReady={mount}
      />
    </>
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
      <span className="block rounded-[2px] border border-line px-3">{children}</span>
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
            <span className="inline-block rounded-[2px] border border-line px-3 py-2.5 text-sm peer-checked:border-transparent peer-checked:bg-pine-l peer-checked:text-pine-d peer-checked:shadow-[inset_0_0_0_1px_var(--pine)]">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error ? <span className="mt-1 block text-xs text-warn">{error}</span> : null}
    </fieldset>
  );
}
