import { connection } from "next/server";
import { Suspense } from "react";
import { InquiryInbox } from "@/components/owner/inquiry-inbox";
import { loadOwnerDashboard } from "@/lib/owner-dashboard-load";
import { canonical } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: "Inquiry",
    ...canonical(`/owner/inquiries/${id}`),
  };
}

export default function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Inquiry params={params} />
    </Suspense>
  );
}

async function Inquiry({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const dashboard = await loadOwnerDashboard();
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 pb-20 md:px-7 md:py-6 md:pb-6">
      <h1 className="sr-only">Inquiry</h1>
      <InquiryInbox inquiries={dashboard.inquiries} selectedId={id} />
    </div>
  );
}
