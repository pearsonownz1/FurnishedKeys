import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LeadNotesControl, LeadStatusControl } from "@/components/admin/lead-fields";
import { AdminPage } from "@/components/admin/record-table";
import { loadOwnerLeads } from "@/lib/admin-load";
import { interestLabel, relativeTime } from "@/lib/admin-present";
import { canonical } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return canonical(`/admin/leads/${id}`);
}

export default function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const leads = await loadOwnerLeads();
  const lead = leads.find((row) => row.id === id);
  if (!lead) notFound();
  const now = new Date();
  return (
    <AdminPage title={lead.name} subtitle={lead.email}>
      <p className="mt-4 text-sm">
        <Link href="/admin/leads" className="font-semibold text-pine">
          All leads
        </Link>
      </p>
      <dl className="mt-6 grid max-w-xl gap-4 text-sm">
        <div>
          <dt className="text-muted">Source</dt>
          <dd>{lead.source_label}</dd>
        </div>
        <div>
          <dt className="text-muted">Interest</dt>
          <dd>{interestLabel(lead.interest)}</dd>
        </div>
        <div>
          <dt className="text-muted">Phone</dt>
          <dd>{lead.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Address</dt>
          <dd>{lead.address ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Received</dt>
          <dd>
            <time dateTime={lead.created_at}>{relativeTime(lead.created_at, now)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Status</dt>
          <dd className="mt-1">
            <LeadStatusControl id={lead.id} name={lead.name} status={lead.status} />
          </dd>
        </div>
        <div>
          <dt className="text-muted">Notes</dt>
          <dd className="mt-1">
            <LeadNotesControl id={lead.id} notes={lead.notes} />
          </dd>
        </div>
      </dl>
    </AdminPage>
  );
}
