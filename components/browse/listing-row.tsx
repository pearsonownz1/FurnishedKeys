import Image from "next/image";
import Link from "next/link";

export type BrowseItem = {
  id: string;
  slug: string;
  title: string;
  meta: string;
  rent: string;
  fees: string[];
  tags: string[];
  confirmed: string | null;
  imageUrl: string | null;
  imageAlt: string;
  isDemo: boolean;
  lat: number | null;
  lng: number | null;
  priceLabel: string;
};

export function ListingRow({
  item,
  active,
  onActive,
}: {
  item: BrowseItem;
  active: boolean;
  onActive: (id: string) => void;
}) {
  return (
    <article className="border-t border-line py-4">
      <Link
        href={`/rentals/${item.slug}`}
        onMouseEnter={() => onActive(item.id)}
        onFocus={() => onActive(item.id)}
        className="grid grid-cols-[112px_1fr] gap-3 sm:grid-cols-[200px_1fr] sm:gap-5 lg:grid-cols-[260px_1fr]"
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2px] bg-stone">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.imageAlt}
              fill
              unoptimized
              sizes="(min-width: 1024px) 260px, 200px"
              className="object-cover"
            />
          ) : null}
          {item.isDemo ? (
            <span className="absolute top-2 left-2 rounded-[2px] bg-white/92 px-1.5 py-1 text-[10px] font-semibold tracking-[0.06em] text-ink uppercase">
              Demo listing
            </span>
          ) : null}
        </div>
        <div className="min-w-0">
          <h3
            className={`text-[17px] font-semibold tracking-tight ${active ? "text-pine" : "text-ink"}`}
          >
            {item.title}
          </h3>
          <p className="mt-1 text-[13px] text-muted">{item.meta}</p>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[21px] font-semibold">{item.rent}</span>
            <span className="text-[13px] text-muted">/ month rent</span>
          </p>
          {item.fees.length > 0 ? (
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
              {item.fees.map((fee) => (
                <li key={fee}>{fee}</li>
              ))}
            </ul>
          ) : null}
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-[2px] border border-line px-1.5 py-0.5 text-[11px] text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
          {item.confirmed ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ok">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
              {item.confirmed}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
