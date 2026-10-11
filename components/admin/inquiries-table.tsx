import Link from "next/link";
import { AdminPage, RecordCell, RecordTable, RecordTabs } from "@/components/admin/record-table";
import type { AdminInquiryRow } from "@/lib/admin-load";
import { relativeTime, roleLabel } from "@/lib/admin-present";
import { stayRange } from "@/lib/owner-dashboard";

export function InquiriesTable({
  inquiries,
  tab,
  now,
}: {
  inquiries: AdminInquiryRow[];
  tab: "all" | "unreplied" | "replied";
  now: Date;
}) {
  const reply = (status: string) => (status === "new" ? "unreplied" : "replied");
  const counts = {
    all: inquiries.length,
    unreplied: inquiries.filter((row) => reply(row.status) === "unreplied").length,
    replied: inquiries.filter((row) => reply(row.status) === "replied").length,
  };
  const visible = tab === "all" ? inquiries : inquiries.filter((row) => reply(row.status) === tab);

  return (
    <AdminPage title="Inquiries" subtitle="Inquiries sent to owners, across every listing.">
      <RecordTabs
        tabs={[
          { href: "/admin/inquiries", label: "All", count: counts.all, on: tab === "all" },
          { href: "/admin/inquiries?filter=unreplied", label: "Unreplied", count: counts.unreplied, on: tab === "unreplied" },
          { href: "/admin/inquiries?filter=replied", label: "Replied", count: counts.replied, on: tab === "replied" },
        ]}
      />
      <RecordTable columns={["Name", "Listing", "Contact", "Status", "Stay", "Received"]}>
        {visible.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3.5 py-6 text-muted">
              No inquiries in this view.
            </td>
          </tr>
        ) : (
          visible.map((inquiry) => (
            <tr key={inquiry.id}>
              <RecordCell>
                <Link href={`/admin/inquiries/${inquiry.id}`} className="font-semibold hover:text-pine">
                  {inquiry.name}
                </Link>
                <span className="mt-1 block max-w-xs truncate text-muted">{inquiry.message}</span>
              </RecordCell>
              <RecordCell>{inquiry.listing_title?.trim() || "Untitled listing"}</RecordCell>
              <RecordCell>
                <a href={`mailto:${inquiry.email}`} className="text-pine">
                  {inquiry.email}
                </a>
                <span className="mt-1 block">{inquiry.phone ? <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a> : "—"}</span>
              </RecordCell>
              <RecordCell>{roleLabel(inquiry.status)}</RecordCell>
              <RecordCell>{stayRange(inquiry.move_in, inquiry.move_out) || "—"}</RecordCell>
              <RecordCell>
                <time dateTime={inquiry.created_at}>{relativeTime(inquiry.created_at, now)}</time>
              </RecordCell>
            </tr>
          ))
        )}
      </RecordTable>
    </AdminPage>
  );
}
