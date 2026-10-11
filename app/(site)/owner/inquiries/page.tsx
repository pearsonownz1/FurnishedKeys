import { connection } from "next/server";
import { Suspense } from "react";
import { InquiryInbox } from "@/components/owner/inquiry-inbox";
import { loadOwnerDashboard } from "@/lib/owner-dashboard-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Inquiries",
  description: "Messages from renters about your listings.",
  ...canonical("/owner/inquiries"),
};

export default function InquiriesPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Inquiries />
    </Suspense>
  );
}

async function Inquiries() {
  await connection();
  const dashboard = await loadOwnerDashboard();
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 pb-20 md:px-7 md:py-6 md:pb-6">
      <h1 className="sr-only">Inquiries</h1>
      <InquiryInbox inquiries={dashboard.inquiries} selectedId={null} />
    </div>
  );
}
