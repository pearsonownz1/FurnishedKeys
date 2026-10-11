import { connection } from "next/server";
import { Suspense } from "react";
import { InquiryInbox } from "@/components/owner/inquiry-inbox";
import { firstName, messagesFromThread, occupantLabel, petsLabel, stayRange } from "@/lib/owner-dashboard";
import { loadOwnerDashboard, loadThread } from "@/lib/owner-dashboard-load";
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
  const thread = await loadThread(id);
  const dashboard = await loadOwnerDashboard();
  const now = new Date();
  const inquiries = thread
    ? dashboard.inquiries.map((inquiry) =>
        inquiry.id === id ? { ...inquiry, unread: false, status: thread.inquiry.status } : inquiry,
      )
    : dashboard.inquiries;
  const listed = inquiries.find((inquiry) => inquiry.id === id) ?? null;
  const selected = thread
    ? {
        id: thread.inquiry.id,
        listingId: thread.inquiry.listing_id,
        listingTitle: thread.inquiry.listing_title,
        name: thread.inquiry.name,
        firstName: firstName(thread.inquiry.name),
        email: thread.inquiry.email,
        phone: thread.inquiry.phone,
        status: thread.inquiry.status,
        createdAt: listed?.createdAt ?? "",
        listTime: listed?.listTime ?? "",
        dateLabel: stayRange(thread.inquiry.move_in, thread.inquiry.move_out),
        occupantLabel: occupantLabel(thread.inquiry.occupants),
        petsLabel: petsLabel(thread.inquiry.pets),
        preview: listed?.preview ?? "",
        unread: false,
        messages: messagesFromThread({
          inquiryId: thread.inquiry.id,
          message: thread.inquiry.message,
          renterName: thread.inquiry.name,
          messages: thread.messages,
          now,
        }),
      }
    : listed;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col p-4 pb-20 md:px-7 md:py-6 md:pb-6">
      <h1 className="sr-only">Inquiry</h1>
      <InquiryInbox inquiries={inquiries} selected={selected} missing={!selected} />
    </div>
  );
}
