"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { updateLeadNotes, updateLeadStatus } from "@/app/(site)/admin/actions";
import { ownerLeadStatuses, type OwnerLeadStatus } from "@/lib/db/types";
import { leadStatusLabel } from "@/lib/admin-present";

function statusClass(status: OwnerLeadStatus): string {
  if (status === "new") return "bg-[#f4ead8] text-warn";
  if (status === "contacted") return "bg-stone text-muted";
  if (status === "qualified") return "bg-pine-l text-pine-d";
  if (status === "onboarded") return "bg-pine text-white";
  return "bg-[#f1e3dc] text-clay";
}

export function LeadStatusControl({ id, name, status }: { id: string; name: string; status: OwnerLeadStatus }) {
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <label className="relative inline-flex">
        <select
          value={value}
          disabled={pending}
          aria-label={`Status for ${name}`}
          className={`appearance-none py-0.5 pr-6 pl-2 text-[11px] font-semibold ${statusClass(value)}`}
          onChange={(event) => {
            const next = event.target.value as OwnerLeadStatus;
            if (next === value) return;
            const previous = value;
            setValue(next);
            setPending(true);
            setSaved(false);
            setError(null);
            void updateLeadStatus(id, next).then((result) => {
              setPending(false);
              if (!result.ok) {
                setValue(previous);
                setError(result.formError ?? "We couldn't update this lead. Please try again.");
                return;
              }
              setSaved(true);
            });
          }}
        >
          {ownerLeadStatuses.map((option) => (
            <option key={option} value={option}>
              {leadStatusLabel(option)}
            </option>
          ))}
        </select>
        <ChevronDown size={12} strokeWidth={1.6} aria-hidden="true" className="pointer-events-none absolute top-1 right-1" />
      </label>
      {pending ? <p className="mt-1 text-xs text-muted">Saving…</p> : null}
      {saved ? <p className="mt-1 text-xs text-pine">Saved</p> : null}
      {error ? (
        <p className="mt-1 max-w-48 text-xs text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function LeadNotesControl({ id, notes }: { id: string; notes: string | null }) {
  const initial = notes ?? "";
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <input
        value={value}
        disabled={pending}
        placeholder="Add a note…"
        aria-label="Notes"
        maxLength={8000}
        onChange={(event) => {
          setValue(event.target.value);
          setSaved(false);
        }}
        onBlur={() => {
          if (value.trim() === initial.trim()) return;
          setPending(true);
          setError(null);
          void updateLeadNotes(id, value).then((result) => {
            setPending(false);
            if (!result.ok) {
              setSaved(false);
              setError(result.formError ?? "We couldn't update this lead. Please try again.");
              return;
            }
            setSaved(true);
          });
        }}
        className="w-full min-w-36 bg-transparent text-[13px] placeholder:text-muted"
      />
      {pending ? <p className="mt-1 text-xs text-muted">Saving…</p> : null}
      {saved ? <p className="text-xs text-pine">Saved</p> : null}
      {error ? (
        <p className="mt-1 text-xs text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
