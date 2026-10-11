import Link from "next/link";
import { Check, Home, MessageSquare, UserPlus, UserRound, type LucideIcon } from "lucide-react";
import { CoverImage } from "@/components/cover-image";
import type { ActivityItem, ActivityKind, AdminCounts, ReviewQueueRow } from "@/lib/admin-load";
import { greeting, relativeTime, shortName, submittedLabel } from "@/lib/admin-present";

const activityIcon: Record<ActivityKind, LucideIcon> = {
  listing_submitted: Home,
  listing_approved: Check,
  inquiry: MessageSquare,
  owner_lead: UserPlus,
  signup: UserRound,
};

export function Overview({
  name,
  counts,
  queue,
  activity,
  now,
}: {
  name: string;
  counts: AdminCounts;
  queue: ReviewQueueRow[];
  activity: ActivityItem[];
  now: Date;
}) {
  const tiles = [
    { label: "Live listings", value: String(counts.listings_live), detail: `of ${counts.listings_total}`, hot: false },
    { label: "Waiting for review", value: String(counts.review_waiting), detail: null, hot: counts.review_waiting > 0 },
    { label: "New owner leads", value: String(counts.leads_new), detail: null, hot: false },
    { label: "Inquiries (7 days)", value: String(counts.inquiries_7d), detail: null, hot: false },
    { label: "Owners", value: String(counts.owners_total), detail: null, hot: false },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 pb-24 md:px-10 md:pb-8">
      <h1 className="font-serif text-[40px] leading-[1.05] font-normal">{greeting(now, name)}</h1>
      <p className="mt-1.5 mb-6 text-muted">Here&apos;s what needs you on Furnished Keys today.</p>
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={
              tile.hot
                ? "border border-pine bg-white px-[18px] py-4 shadow-[inset_0_3px_0_var(--pine)]"
                : "border border-line bg-white px-[18px] py-4"
            }
          >
            <b className="block font-serif text-[38px] leading-none font-normal">{tile.value}</b>
            {tile.detail ? <span className="mt-1 block text-[13px] text-muted">{tile.detail}</span> : null}
            <span className="mt-1.5 block text-[13px] text-muted">{tile.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-[18px] py-3.5">
            <h2 className="text-sm font-semibold">Review queue</h2>
            <span className="text-[13px] text-muted">Oldest first</span>
          </div>
          {queue.length === 0 ? (
            <p className="px-[18px] py-6 text-[13px] text-muted">Nothing is waiting for review.</p>
          ) : (
            <ul>
              {queue.map((listing) => (
                <li key={listing.id} className="border-b border-line last:border-b-0">
                  <div className="flex items-center gap-3.5 px-[18px] py-3">
                    <span className="relative h-[52px] w-[72px] shrink-0 bg-stone">
                      <CoverImage src={listing.cover_url} alt="" sizes="72px" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{listing.title?.trim() || "Untitled listing"}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        {[shortName(listing.owner_name), listing.city, submittedLabel(listing.submitted_at, now)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <Link
                      href={`/admin/review?id=${listing.id}`}
                      className="ml-auto shrink-0 text-[13px] font-semibold text-pine"
                    >
                      Review →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-line px-[18px] py-3 text-[13px]">
            <p>New owner leads: {counts.leads_new}</p>
            <Link href="/admin/leads" className="shrink-0 font-semibold text-pine">
              Open leads →
            </Link>
          </div>
        </section>
        <section className="border border-line bg-white">
          <div className="border-b border-line px-[18px] py-3.5">
            <h2 className="text-sm font-semibold">Recent activity</h2>
          </div>
          {activity.length === 0 ? (
            <p className="px-[18px] py-6 text-[13px] text-muted">Nothing new yet.</p>
          ) : (
            <ul>
              {activity.map((item) => {
                const Icon = activityIcon[item.kind];
                return (
                  <li key={`${item.kind}-${item.href}-${item.at}`} className="border-b border-line last:border-b-0">
                    <div className="flex items-start gap-3 px-[18px] py-[11px] text-[13px]">
                      <Icon size={16} strokeWidth={1.6} aria-hidden="true" className="mt-0.5 shrink-0 text-muted" />
                      <time dateTime={item.at} className="w-16 shrink-0 text-muted">
                        {relativeTime(item.at, now)}
                      </time>
                      <Link href={item.href} className="font-medium hover:text-pine">
                        {item.label}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
