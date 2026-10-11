"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MessageSquare, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { NewListingButton } from "@/components/owner/new-listing-button";
import type { DashboardOwner } from "@/lib/owner-dashboard";

const items = [
  { href: "/owner/listings", label: "Listings", icon: Home },
  { href: "/owner/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/owner/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/owner/settings", label: "Settings", icon: Settings },
] as const;

function current(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OwnerFrame({
  owner,
  unread,
  locationId,
  children,
}: {
  owner: DashboardOwner;
  unread: number;
  locationId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh flex-col overflow-x-hidden bg-bg text-sm text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-5 md:px-6">
        <Link href="/" className="font-serif text-[22px] tracking-[-0.3px]">
          Furnished <span className="italic">Keys</span>
        </Link>
        <div className="flex items-center gap-5 text-muted">
          <Link href="/" className="hover:text-ink">
            View site
          </Link>
          <details className="relative">
            <summary className="grid size-[30px] cursor-pointer list-none place-items-center rounded-full bg-pine-l text-xs font-semibold text-pine [&::-webkit-details-marker]:hidden">
              {owner.initials}
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-56 border border-line bg-white p-3 text-left text-ink">
              <p className="font-semibold">{owner.name}</p>
              {owner.email ? <p className="mt-1 break-all text-muted">{owner.email}</p> : null}
              <form method="post" action="/sign-out" className="mt-3">
                <button type="submit" className="font-semibold text-pine">
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-line bg-white px-3 py-5 md:flex">
          <nav aria-label="Owner" className="grid gap-0.5">
            {items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} unread={unread} />
            ))}
          </nav>
          <NewListingButton
            locationId={locationId}
            className="mt-auto border border-pine py-2.5 text-center font-semibold text-pine"
          />
        </aside>
        <div id="content" className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
      <nav aria-label="Owner" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white md:hidden">
        <ul className="grid grid-cols-4">
          {items.map((item) => {
            const on = current(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={
                    on
                      ? "flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-semibold text-pine-d"
                      : "flex flex-col items-center gap-1 px-1 py-2 text-[11px] text-muted"
                  }
                >
                  <span className="relative">
                    <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                    {item.href === "/owner/inquiries" && unread > 0 ? (
                      <span className="absolute -top-1.5 -right-2 rounded-full bg-pine px-1 text-[10px] leading-4 font-semibold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  unread,
}: {
  item: (typeof items)[number];
  pathname: string;
  unread: number;
}) {
  const on = current(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={
        on
          ? "flex items-center gap-3 rounded-[2px] bg-pine-l px-3 py-2.5 font-medium text-pine-d"
          : "flex items-center gap-3 rounded-[2px] px-3 py-2.5 font-medium text-muted"
      }
    >
      <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
      {item.label}
      {item.href === "/owner/inquiries" && unread > 0 ? (
        <span className="ml-auto rounded-full bg-pine px-[7px] py-px text-[11px] font-semibold text-white">
          {unread}
        </span>
      ) : null}
    </Link>
  );
}
