import Link from "next/link";
import { InquiryDetail } from "@/components/owner/inquiry-detail";
import type { DashboardInquiry } from "@/lib/owner-dashboard";

export function InquiryInbox({
  inquiries,
  selectedId,
}: {
  inquiries: DashboardInquiry[];
  selectedId: string | null;
}) {
  const selected = inquiries.find((inquiry) => inquiry.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden border border-line bg-white">
      <div
        className={`${selected ? "hidden md:flex" : "flex"} min-w-0 w-full flex-col md:w-[340px] md:shrink-0 md:border-r md:border-line`}
      >
        {inquiries.length === 0 ? (
          <p className="p-5 text-muted">No inquiries.</p>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {inquiries.map((inquiry) => {
              const on = inquiry.id === selected?.id;
              return (
                <li key={inquiry.id}>
                  <Link
                    href={`/owner/inquiries/${inquiry.id}`}
                    aria-current={on ? "true" : undefined}
                    className={
                      on
                        ? "block min-w-0 border-b border-line bg-bg px-[18px] py-3.5 shadow-[inset_3px_0_0_var(--pine)]"
                        : "block min-w-0 border-b border-line px-[18px] py-3.5"
                    }
                  >
                    <span className="flex min-w-0 items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-semibold">
                        {inquiry.unread ? (
                          <span className="mr-1.5 inline-block size-[7px] rounded-full bg-clay align-middle">
                            <span className="sr-only">New</span>
                          </span>
                        ) : null}
                        {inquiry.name}
                      </span>
                      <span className="shrink-0 text-[13px] text-muted">{inquiry.listTime}</span>
                    </span>
                    <span className="mt-0.5 block break-words text-[13px] text-muted">
                      {inquiry.listingTitle} · {inquiry.dateLabel}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-muted">{inquiry.preview}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className={`${selected ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-1 flex-col`}>
        {selected ? (
          <InquiryDetail key={`${selected.id}-${selected.messages.length}-${selected.status}`} inquiry={selected} />
        ) : (
          <p className="p-6 text-muted">Select an inquiry.</p>
        )}
      </div>
    </div>
  );
}
