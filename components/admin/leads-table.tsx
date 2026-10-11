"use client";

import Link from "next/link";
import { AdminPage, RecordCell, RecordTable, RecordTabs } from "@/components/admin/record-table";
import { LeadNotesControl, LeadStatusControl } from "@/components/admin/lead-fields";
import { ownerLeadStatuses, type OwnerLeadStatus } from "@/lib/db/types";
import type { AdminLeadRow } from "@/lib/admin-load";
import { interestLabel, leadStatusLabel } from "@/lib/admin-present";

const tabs: { id: "all" | OwnerLeadStatus; label: string }[] = [
  { id: "all", label: "All" },
  ...ownerLeadStatuses.map((status) => ({ id: status, label: leadStatusLabel(status) })),
];

export function LeadsTable({
  leads,
  tab,
}: {
  leads: AdminLeadRow[];
  tab: "all" | OwnerLeadStatus;
}) {
  const counts = {
    all: leads.length,
    ...Object.fromEntries(ownerLeadStatuses.map((status) => [status, leads.filter((lead) => lead.status === status).length])),
  } as Record<"all" | OwnerLeadStatus, number>;
  const visible = tab === "all" ? leads : leads.filter((lead) => lead.status === tab);

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
      <RecordTable columns={["Owner", "Source", "Interest", "Phone", "Address", "Status", "Notes"]}>
        {visible.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-3.5 py-6 text-muted">
              No leads in this view.
            </td>
          </tr>
        ) : (
          visible.map((lead) => (
            <tr key={lead.id}>
              <RecordCell>
                <Link href={`/admin/leads/${lead.id}`} className="block font-semibold hover:text-pine">
                  {lead.name}
                </Link>
                <span className="text-muted">{lead.email}</span>
              </RecordCell>
              <RecordCell>{lead.source_label}</RecordCell>
              <RecordCell>{interestLabel(lead.interest)}</RecordCell>
              <RecordCell>{lead.phone ?? "—"}</RecordCell>
              <RecordCell>{lead.address ?? "—"}</RecordCell>
              <RecordCell>
                <LeadStatusControl id={lead.id} name={lead.name} status={lead.status} />
              </RecordCell>
              <RecordCell>
                <LeadNotesControl key={`${lead.id}:${lead.notes ?? ""}`} id={lead.id} notes={lead.notes} />
              </RecordCell>
            </tr>
          ))
        )}
      </RecordTable>
    </AdminPage>
  );
}
