import Link from "next/link";
import { CoverImage } from "@/components/cover-image";
import {
  greeting,
  presentActivity,
  queueMeta,
  type AdminConsole,
} from "@/lib/admin-console";

export function Overview({ data, now }: { data: AdminConsole; now: Date }) {
  const tiles = [
    { label: "Waiting for review", value: data.waiting, hot: data.waiting > 0 },
    { label: "Live listings", value: data.live, hot: false },
    { label: "New owner leads", value: data.newLeads, hot: false },
    { label: "Inquiries this week", value: data.inquiriesThisWeek, hot: false },
    { label: "New signups", value: data.newSignups, hot: false },
  ];
  const activity = presentActivity(data.activity, now);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 pb-24 md:px-10 md:pb-8">
      <h1 className="font-serif text-[40px] leading-[1.05] font-normal">{greeting(now, data.staff.name)}</h1>
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
          {data.queue.length === 0 ? (
            <p className="px-[18px] py-6 text-[13px] text-muted">Nothing is waiting for review.</p>
          ) : (
            <ul>
              {data.queue.map((listing) => (
                <li key={listing.id} className="border-b border-line last:border-b-0">
                  <div className="flex items-center gap-3.5 px-[18px] py-3">
                    <span className="relative h-[52px] w-[72px] shrink-0 bg-stone">
                      <CoverImage src={listing.coverUrl} alt="" sizes="72px" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{listing.title}</span>
                      <span className="mt-0.5 block text-[13px] text-muted">
                        {queueMeta(listing.ownerName, listing.city, listing.submittedAt, now)}
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
            <p>
              Owner leads: {data.newLeads} new, {data.letterLeads} from the letter
            </p>
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
              {activity.map((item) => (
                <li key={item.id} className="border-b border-line last:border-b-0">
                  <div className="flex gap-3 px-[18px] py-[11px] text-[13px]">
                    <time dateTime={item.at} className="w-16 shrink-0 text-muted">
                      {item.when}
                    </time>
                    <p>
                      {item.pieces.map((piece, index) =>
                        piece.strong ? (
                          <strong key={index} className="font-semibold">
                            {piece.text}
                          </strong>
                        ) : (
                          <span key={index}>{piece.text}</span>
                        ),
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
