import { connection } from "next/server";
import { Suspense } from "react";
import { InquiriesTable } from "@/components/admin/inquiries-table";
import { inquiryTab, inquiryTabCounts } from "@/lib/admin-console";
import { loadAdminConsole } from "@/lib/admin-console-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Inquiries",
  description: "Inquiries sent to owners.",
  ...canonical("/admin/inquiries"),
};

type Search = Record<string, string | string[] | undefined>;

export default function InquiriesPage({ searchParams }: { searchParams: Promise<Search> }) {
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
  const raw = params.filter;
  const tab = inquiryTab(Array.isArray(raw) ? raw[0] : raw);
  const inquiries =
    tab === "all" ? gate.data.inquiries : gate.data.inquiries.filter((row) => row.reply === tab);
  return (
    <InquiriesTable
      inquiries={inquiries}
      counts={inquiryTabCounts(gate.data.inquiries)}
      tab={tab}
      now={new Date()}
    />
  );
}
