import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminPage } from "@/components/admin/record-table";
import { loadAdminInquiries } from "@/lib/admin-load";
import { relativeTime, roleLabel } from "@/lib/admin-present";
import { stayRange } from "@/lib/owner-dashboard";
import { canonical } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return canonical(`/admin/inquiries/${id}`);
}

export default function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen params={params} />
    </Suspense>
  );
}

async function Screen({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const inquiries = await loadAdminInquiries();
  const inquiry = inquiries.find((row) => row.id === id);
  if (!inquiry) notFound();
  return (
    <AdminPage title={inquiry.name} subtitle={inquiry.listing_title?.trim() || "Untitled listing"}>
      <p className="mt-4 text-sm">
        <Link href="/admin/inquiries" className="font-semibold text-pine">
          All inquiries
        </Link>
      </p>
      <dl className="mt-6 grid max-w-xl gap-4 text-sm">
        <div>
          <dt className="text-muted">Email</dt>
          <dd>
            <a href={`mailto:${inquiry.email}`} className="text-pine">
              {inquiry.email}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Phone</dt>
          <dd>{inquiry.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Status</dt>
          <dd>{roleLabel(inquiry.status)}</dd>
        </div>
        <div>
          <dt className="text-muted">Stay</dt>
          <dd>{stayRange(inquiry.move_in, inquiry.move_out) || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">Received</dt>
          <dd>
            <time dateTime={inquiry.created_at}>{relativeTime(inquiry.created_at, new Date())}</time>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Message</dt>
          <dd className="whitespace-pre-wrap">{inquiry.message}</dd>
        </div>
      </dl>
    </AdminPage>
  );
}
