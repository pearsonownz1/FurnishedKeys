import { connection } from "next/server";
import { Suspense } from "react";
import { LeadsTable } from "@/components/admin/leads-table";
import { leadTab, leadTabCounts, matchesLeadTab } from "@/lib/admin-console";
import { loadAdminConsole } from "@/lib/admin-console-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Owner leads",
  description: "People who asked about listing or management.",
  ...canonical("/admin/leads"),
};

type Search = Record<string, string | string[] | undefined>;

export default function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}

async function Screen({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const gate = await loadAdminConsole();
  if (gate.kind !== "ready") return null;
  const params = await searchParams;
  const raw = params.status;
  const tab = leadTab(Array.isArray(raw) ? raw[0] : raw);
  const leads = gate.data.leads.filter((lead) => matchesLeadTab(lead.status, tab));
  return <LeadsTable leads={leads} counts={leadTabCounts(gate.data.leads)} tab={tab} />;
}
