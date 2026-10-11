import { connection } from "next/server";
import { Suspense } from "react";
import { LeadsTable } from "@/components/admin/leads-table";
import { loadOwnerLeads } from "@/lib/admin-load";
import { leadStatusParam } from "@/lib/admin-present";
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
  const [leads, params] = await Promise.all([loadOwnerLeads(), searchParams]);
  const raw = params.status;
  const status = leadStatusParam(Array.isArray(raw) ? raw[0] : raw);
  return <LeadsTable leads={leads} tab={status ?? "all"} />;
}
