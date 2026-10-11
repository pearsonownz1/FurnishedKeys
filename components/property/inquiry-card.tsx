"use client";

import { submitInquiry } from "@/app/(site)/rentals/actions";
import { DateField } from "@/components/date-field";
import type { InquiryActionState, InquiryField } from "@/lib/inquiry";
import { readInquiryForm, validateInquiry } from "@/lib/inquiry";
import type { AvailabilityWindow } from "@/lib/db/types";
import { moveOutAfterMoveInChange } from "@/lib/search";
import { useActionState, useState, type ReactNode } from "react";

const empty: InquiryActionState = { ok: false };

type Constraints = {
  minStayMonths: number;
  maxOccupants: number;
  petsAllowed: boolean;
  availability: AvailabilityWindow[];
  blockedDates?: string[];
};

export function InquiryCard({
  listingId,
  rentLabel,
  availabilityLine,
  defaults,
  constraints,
}: {
  listingId: string;
  rentLabel: string;
  availabilityLine: string;
  defaults: { moveIn: string; moveOut: string; occupants: number; flexible?: boolean };
  constraints: Constraints;
}) {
  async function action(
    previous: InquiryActionState,
    formData: FormData,
  ): Promise<InquiryActionState> {
    const input = readInquiryForm(formData);
    const local = validateInquiry(input, constraints);
    if (!local.ok) return { ok: false, fieldErrors: local.fieldErrors };
    return submitInquiry(previous, formData);
  }

  const [state, formAction, pending] = useActionState(action, empty);
  const [moveIn, setMoveIn] = useState(defaults.moveIn);
  const [moveOut, setMoveOut] = useState(defaults.flexible ? "" : defaults.moveOut);
  const [flexible, setFlexible] = useState(Boolean(defaults.flexible));

  if (state.success) {
    return (
      <aside id="inquiry" className="scroll-mt-6 rounded-[4px] border border-line bg-surface p-6 shadow-search">
        <p className="text-lg font-semibold" role="status">
          Inquiry sent
        </p>
        <p className="mt-2 text-sm text-muted">
          You won&apos;t be charged. The owner replies by email.
        </p>
      </aside>
    );
  }

  return (
    <aside id="inquiry" className="scroll-mt-6 rounded-[4px] border border-line bg-surface p-6 shadow-search lg:sticky lg:top-6">
      <p className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold">{rentLabel}</span>
        <span className="text-sm text-muted">/ month rent</span>
      </p>
      <p className="mt-2.5 mb-4 flex items-start gap-1.5 text-[13px] text-ok">
        <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ok" />
        {availabilityLine}
      </p>
      <form action={formAction} noValidate className="space-y-2.5">
        <input type="hidden" name="listingId" value={listingId} />
        <div className="grid grid-cols-2 border border-line">
          <Field label="Move in" name="moveIn" error={state.fieldErrors?.moveIn}>
            <DateField
              id="moveIn"
              name="moveIn"
              label="Move in"
              variant="plain"
              value={moveIn}
              invalid={Boolean(state.fieldErrors?.moveIn)}
              onChange={(next) => {
                setMoveIn(next);
                setMoveOut((current) => moveOutAfterMoveInChange(next, current));
              }}
            />
          </Field>
          <div className="border-b border-line px-3 py-2.5">
            <label
              htmlFor="moveOut"
              className="mb-0.5 block text-[10px] tracking-[0.1em] text-muted uppercase"
            >
              Move out
            </label>
            <DateField
              id="moveOut"
              name="moveOut"
              label="Move out"
              variant="plain"
              value={flexible ? "" : moveOut}
              min={moveIn || undefined}
              disabled={flexible}
              invalid={Boolean(state.fieldErrors?.moveOut)}
              onChange={setMoveOut}
            />
            {state.fieldErrors?.moveOut ? (
              <span className="mt-1 block text-xs text-warn">{state.fieldErrors.moveOut}</span>
            ) : null}
            <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="flexible"
                value="1"
                checked={flexible}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setFlexible(checked);
                  if (checked) setMoveOut("");
                }}
                className="size-4 accent-pine"
              />
              I&apos;m not sure
            </label>
          </div>
          <Field label="Occupants" name="occupants" error={state.fieldErrors?.occupants}>
            <input
              id="occupants"
              type="number"
              name="occupants"
              min={1}
              max={constraints.maxOccupants}
              defaultValue={defaults.occupants}
              aria-invalid={Boolean(state.fieldErrors?.occupants)}
              className="w-full bg-transparent text-sm"
            />
          </Field>
          <Field label="Pets" name="pets" error={state.fieldErrors?.pets}>
            <input
              id="pets"
              type="text"
              name="pets"
              placeholder={constraints.petsAllowed ? "1 dog" : "No pets"}
              disabled={!constraints.petsAllowed}
              aria-invalid={Boolean(state.fieldErrors?.pets)}
              className="w-full bg-transparent text-sm disabled:text-muted"
            />
          </Field>
          <Field label="Name" name="name" error={state.fieldErrors?.name}>
            <input
              id="name"
              type="text"
              name="name"
              autoComplete="name"
              aria-invalid={Boolean(state.fieldErrors?.name)}
              className="w-full bg-transparent text-sm"
            />
          </Field>
          <Field label="Email" name="email" error={state.fieldErrors?.email}>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              aria-invalid={Boolean(state.fieldErrors?.email)}
              className="w-full bg-transparent text-sm"
            />
          </Field>
          <div className="col-span-2">
            <Field label="Phone" name="phone" error={state.fieldErrors?.phone} edge>
              <input
                id="phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                aria-invalid={Boolean(state.fieldErrors?.phone)}
                className="w-full bg-transparent text-sm"
              />
            </Field>
          </div>
        </div>
        <label className="block">
          <span className="sr-only">Message</span>
          <textarea
            id="message"
            name="message"
            rows={3}
            placeholder="Tell the owner a bit about yourself and your stay…"
            aria-invalid={Boolean(state.fieldErrors?.message)}
            className="w-full rounded-[2px] border border-line px-3 py-2.5 text-sm"
          />
          {state.fieldErrors?.message ? (
            <span className="mt-1 block text-xs text-warn">{state.fieldErrors.message}</span>
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
          className="w-full rounded-[2px] bg-pine px-4 py-3.5 text-center font-semibold text-white disabled:opacity-70"
        >
          {pending ? "Sending…" : "Send inquiry"}
        </button>
        <p className="text-center text-xs text-muted">
          You won&apos;t be charged. The owner replies by email.
        </p>
      </form>
    </aside>
  );
}

function Field({
  label,
  name,
  error,
  edge = false,
  children,
}: {
  label: string;
  name: InquiryField;
  error?: string;
  edge?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={`block px-3 py-2.5 ${edge ? "" : "border-r border-b border-line odd:border-r even:border-r-0"}`}
      htmlFor={name}
    >
      <span className="mb-0.5 block text-[10px] tracking-[0.1em] text-muted uppercase">
        {label}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-warn">{error}</span> : null}
    </label>
  );
}
