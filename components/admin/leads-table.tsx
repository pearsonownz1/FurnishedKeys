"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AdminPage, RecordCell, RecordTable, RecordTabs } from "@/components/admin/record-table";
import { saveLeadNotes, setLeadStatus } from "@/lib/admin-adapters";
import {
  leadStatusLabel,
  type AdminLead,
  type LeadStatusValue,
  type LeadTab,
  type LeadUiStatus,
} from "@/lib/admin-console";

const tabs: { id: LeadTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "called", label: "Called" },
  { id: "signed", label: "Signed" },
  { id: "not_interested", label: "Not interested" },
];

const choices: { value: LeadStatusValue; label: string }[] = [
  { value: "new", label: "New" },
  { value: "called", label: "Called" },
  { value: "signed", label: "Signed" },
  { value: "not_interested", label: "Not interested" },
];

export function LeadsTable({
  leads,
  counts,
  tab,
}: {
  leads: AdminLead[];
  counts: Record<LeadTab, number>;
  tab: LeadTab;
}) {
  return (
    <AdminPage
      title="Owner leads"
      subtitle="Everyone who asked about listing or management, from the site and the letter."
    >
      <RecordTabs
        tabs={tabs.map((item) => ({
          href: item.id === "all" ? "/admin/leads" : `/admin/leads?status=${item.id}`,
          label: item.label,
          count: counts[item.id],
          on: tab === item.id,
        }))}
      />
      <RecordTable columns={["Owner", "Source", "Interest", "Phone", "Status", "Notes"]}>
        {leads.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3.5 py-6 text-muted">
              No leads in this view.
            </td>
          </tr>
        ) : (
          leads.map((lead) => (
            <tr key={lead.id}>
              <RecordCell>
                <span className="block font-semibold">{lead.name}</span>
                <span className="text-muted">{lead.email}</span>
              </RecordCell>
              <RecordCell>{lead.sourceLabel}</RecordCell>
              <RecordCell>{lead.interestLabel}</RecordCell>
              <RecordCell>{lead.phone ?? "—"}</RecordCell>
              <RecordCell>
                <LeadStatus id={lead.id} name={lead.name} status={lead.status} />
              </RecordCell>
              <RecordCell>
                <LeadNotes key={`${lead.id}:${lead.notes}`} id={lead.id} notes={lead.notes} />
              </RecordCell>
            </tr>
          ))
        )}
      </RecordTable>
    </AdminPage>
  );
}

function statusClass(status: LeadUiStatus): string {
  if (status === "new") return "bg-[#f4ead8] text-warn";
  if (status === "called" || status === "closed") return "bg-stone text-muted";
  if (status === "signed") return "bg-pine-l text-pine-d";
  return "bg-[#f1e3dc] text-clay";
}

function LeadStatus({ id, name, status }: { id: string; name: string; status: LeadUiStatus }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const options = status === "closed" ? [{ value: "closed" as const, label: "Closed" }, ...choices] : choices;

  return (
    <div>
      <label className="relative inline-flex">
        <span className="sr-only">Status for {name}</span>
        <select
          value={status}
          disabled={pending}
          aria-label={`Status for ${name}`}
          className={`appearance-none py-0.5 pr-6 pl-2 text-[11px] font-semibold ${statusClass(status)}`}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "closed" || next === status) return;
            setPending(true);
            void setLeadStatus({ id, status: next as LeadStatusValue }).then((result) => {
              setPending(false);
              setError(result.formError);
            });
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={12} strokeWidth={1.6} aria-hidden="true" className="pointer-events-none absolute top-1 right-1" />
      </label>
      <span className="sr-only">{leadStatusLabel(status)}</span>
      {error ? (
        <p className="mt-1 max-w-40 text-xs text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function LeadNotes({ id, notes }: { id: string; notes: string }) {
  const [value, setValue] = useState(notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div>
      <input
        value={value}
        disabled={pending}
        placeholder="Add a note…"
        aria-label="Notes"
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          if (value.trim() === notes.trim()) return;
          setPending(true);
          void saveLeadNotes(id, value).then((result) => {
            setPending(false);
            setError(result.ok ? null : result.formError);
          });
        }}
        className="w-full min-w-36 bg-transparent text-[13px] placeholder:text-muted"
      />
      {error ? (
        <p className="mt-1 text-xs text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
