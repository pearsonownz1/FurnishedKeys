import { AdminPage, RecordCell, RecordTable, RecordTabs } from "@/components/admin/record-table";
import { activityWhen, type AdminInquiry, type InquiryTab } from "@/lib/admin-console";

const tabs: { id: InquiryTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unreplied", label: "Unreplied" },
  { id: "replied", label: "Replied" },
];

export function InquiriesTable({
  inquiries,
  counts,
  tab,
  now,
}: {
  inquiries: AdminInquiry[];
  counts: Record<InquiryTab, number>;
  tab: InquiryTab;
  now: Date;
}) {
  return (
    <AdminPage title="Inquiries" subtitle="Inquiries sent to owners, across every listing.">
      <RecordTabs
        tabs={tabs.map((item) => ({
          href: item.id === "all" ? "/admin/inquiries" : `/admin/inquiries?filter=${item.id}`,
          label: item.label,
          count: counts[item.id],
          on: tab === item.id,
        }))}
      />
      <RecordTable columns={["Name", "Listing", "Email", "Phone", "Status", "Received"]}>
        {inquiries.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3.5 py-6 text-muted">
              No inquiries in this view.
            </td>
          </tr>
        ) : (
          inquiries.map((inquiry) => (
            <tr key={inquiry.id}>
              <RecordCell className="font-semibold">{inquiry.name}</RecordCell>
              <RecordCell>{inquiry.listingTitle}</RecordCell>
              <RecordCell>
                <a href={`mailto:${inquiry.email}`} className="text-pine">
                  {inquiry.email}
                </a>
              </RecordCell>
              <RecordCell>
                {inquiry.phone ? (
                  <a href={`tel:${inquiry.phone}`} className="text-pine">
                    {inquiry.phone}
                  </a>
                ) : (
                  "—"
                )}
              </RecordCell>
              <RecordCell>
                <span
                  className={
                    inquiry.reply === "unreplied"
                      ? "inline-block bg-[#f4ead8] px-2 py-0.5 text-[11px] font-semibold text-warn"
                      : "inline-block bg-pine-l px-2 py-0.5 text-[11px] font-semibold text-pine-d"
                  }
                >
                  {inquiry.reply === "unreplied" ? "Unreplied" : "Replied"}
                </span>
              </RecordCell>
              <RecordCell>
                <time dateTime={inquiry.receivedAt}>{activityWhen(inquiry.receivedAt, now)}</time>
              </RecordCell>
            </tr>
          ))
        )}
      </RecordTable>
    </AdminPage>
  );
}
