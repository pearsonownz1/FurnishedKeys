import { connection } from "next/server";
import { Suspense } from "react";
import { InquiriesTable } from "@/components/admin/inquiries-table";
import { loadAdminInquiries } from "@/lib/admin-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Inquiries",
  description: "Inquiries sent to owners.",
  ...canonical("/admin/inquiries"),
};

type Search = Record<string, string | string[] | undefined>;

function inquiryTab(value: string | undefined): "all" | "unreplied" | "replied" {
  if (value === "unreplied" || value === "replied") return value;
  return "all";
}

export default function InquiriesPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}

async function Screen({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const [inquiries, params] = await Promise.all([loadAdminInquiries(), searchParams]);
  const raw = params.filter;
  return (
    <InquiriesTable
      inquiries={inquiries}
      tab={inquiryTab(Array.isArray(raw) ? raw[0] : raw)}
      now={new Date()}
    />
  );
}
