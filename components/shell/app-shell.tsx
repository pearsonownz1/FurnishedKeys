"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand-lockup";

export type ShellLink = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  badge?: number;
  exact?: boolean;
};

export type ShellUser = {
  name: string;
  email: string;
  initials: string;
};

export function shellCurrent(pathname: string, item: Pick<ShellLink, "href" | "exact">) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppShell({
  navLabel,
  items,
  phoneItems,
  moreItems = [],
  user,
  mark,
  topLink,
  footer,
  children,
}: {
  navLabel: string;
  items: ShellLink[];
  phoneItems: ShellLink[];
  moreItems?: ShellLink[];
  user: ShellUser;
  mark?: string;
  topLink: { href: string; label: string };
  footer?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const phoneColumns = phoneItems.length + (moreItems.length > 0 ? 1 : 0);
  const moreOn = moreItems.some((item) => shellCurrent(pathname, item));

  return (
    <div className="flex h-dvh flex-col overflow-x-hidden bg-bg text-sm text-ink">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-5 md:px-6">
        <BrandLockup href="/" mark={mark} priority className="text-[22px] md:hidden" />
        <div className="ml-auto flex items-center gap-5 text-muted">
          <Link href={topLink.href} className="hover:text-ink">
            {topLink.label}
          </Link>
          <details className="relative">
            <summary className="grid size-[30px] cursor-pointer list-none place-items-center rounded-full bg-pine-l text-xs font-semibold text-pine [&::-webkit-details-marker]:hidden">
              {user.initials}
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-56 border border-line bg-white p-3 text-left text-ink">
              <p className="font-semibold">{user.name}</p>
              {user.email ? <p className="mt-1 break-all text-muted">{user.email}</p> : null}
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
          <BrandLockup href="/" mark={mark} priority className="mb-5 w-full flex-wrap px-3 text-[22px]" />
          <nav aria-label={navLabel} className="grid gap-0.5">
            {items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>
          {footer}
        </aside>
        <div id="content" className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
      </div>
      <nav aria-label={navLabel} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white md:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${phoneColumns}, minmax(0, 1fr))` }}>
          {phoneItems.map((item) => (
            <PhoneLink key={item.href} item={item} pathname={pathname} />
          ))}
          {moreItems.length > 0 ? (
            <li>
              <details className="relative">
                <summary
                  className={
                    moreOn
                      ? "flex cursor-pointer list-none flex-col items-center gap-1 px-1 py-2 text-[11px] font-semibold text-pine-d [&::-webkit-details-marker]:hidden"
                      : "flex cursor-pointer list-none flex-col items-center gap-1 px-1 py-2 text-[11px] text-muted [&::-webkit-details-marker]:hidden"
                  }
                >
                  <Ellipsis size={18} strokeWidth={1.6} aria-hidden="true" />
                  More
                </summary>
                <div className="absolute right-2 bottom-full z-50 mb-2 w-44 border border-line bg-white p-2 text-left">
                  {moreItems.map((item) => {
                    const on = shellCurrent(pathname, item);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={on ? "page" : undefined}
                        className={
                          on
                            ? "flex items-center gap-2 px-2 py-2 font-medium text-pine-d"
                            : "flex items-center gap-2 px-2 py-2 text-muted"
                        }
                      >
                        <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </details>
            </li>
          ) : null}
        </ul>
      </nav>
    </div>
  );
}

function NavLink({ item, pathname }: { item: ShellLink; pathname: string }) {
  const on = shellCurrent(pathname, item);
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
      {item.badge ? (
        <span className="ml-auto rounded-full bg-pine px-[7px] py-px text-[11px] font-semibold text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function PhoneLink({ item, pathname }: { item: ShellLink; pathname: string }) {
  const on = shellCurrent(pathname, item);
  const Icon = item.icon;
  return (
    <li>
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
          {item.badge ? (
            <span className="absolute -top-1.5 -right-2 rounded-full bg-pine px-1 text-[10px] leading-4 font-semibold text-white">
              {item.badge}
            </span>
          ) : null}
        </span>
        {item.shortLabel ?? item.label}
      </Link>
    </li>
  );
}
