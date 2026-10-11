"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/components/auth/use-hydrated";
import { ResourcesNav } from "@/components/resources-nav";
import type { UserRole } from "@/lib/db/types";

const links = [
  { href: "/rentals", label: "Find a home" },
  { href: "/owners", label: "List your property" },
  { href: "/management", label: "Management" },
] as const;

const signIn = { href: "/sign-in", label: "Sign in" } as const;

function ownerFlow(pathname: string) {
  return (
    pathname === "/signup" ||
    pathname === "/owners/start" ||
    pathname.startsWith("/owners/listings/")
  );
}

export function SiteHeader({
  tone = "solid",
  signedIn = false,
  role = null,
}: {
  tone?: "overlay" | "solid";
  signedIn?: boolean;
  role?: UserRole | null;
}) {
  const pathname = usePathname();
  const hydrated = useHydrated();
  if (ownerFlow(pathname)) {
    return (
      <header className="border-b border-line bg-surface text-ink">
        <div className="flex h-16 items-center justify-between gap-3 px-5 md:px-8">
          <Link href="/" className="font-serif text-[22px] tracking-[-0.3px] sm:text-[26px]">
            Furnished <span className="italic">Keys</span>
          </Link>
          <Link href="/owners" className="text-sm">
            Save and exit
          </Link>
        </div>
      </header>
    );
  }

  const overlay = tone === "overlay";
  const listClass = overlay
    ? "rounded-[2px] border border-white/70 px-3.5 py-2 text-sm"
    : "rounded-[2px] border border-ink px-3 py-2 text-sm text-ink";
  const menuClass = overlay
    ? "cursor-pointer rounded-[2px] border border-white/70 px-3 py-2 text-sm"
    : "cursor-pointer rounded-[2px] border border-line bg-surface px-3 py-2 text-sm";
  const accountHref = role === "admin" ? "/admin" : "/owner";
  const accountLabel = role === "admin" ? "Admin" : "My listings";

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-20 text-white"
          : "relative z-20 border-b border-line bg-surface text-ink"
      }
    >
      <div
        className={
          overlay
            ? "shell flex h-[72px] items-center justify-between gap-3"
            : "flex h-16 items-center justify-between gap-3 px-5 md:px-8"
        }
      >
        <Link
          href="/"
          className="font-serif text-[22px] tracking-[-0.3px] sm:text-[26px]"
        >
          Furnished <span className="italic">Keys</span>
        </Link>

        <nav
          aria-label="Primary"
          className={`hidden items-center gap-7 text-sm lg:flex ${overlay ? "" : "text-muted"}`}
        >
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={active ? "font-semibold hover:opacity-80" : "hover:opacity-80"}
              >
                {link.label}
              </Link>
            );
          })}
          <ResourcesNav key={pathname} variant="desktop" />
          {signedIn ? null : (
            <Link href={signIn.href} className="hover:opacity-80">
              {signIn.label}
            </Link>
          )}
          {signedIn ? (
            <AccountLinks
              href={accountHref}
              label={accountLabel}
              hydrated={hydrated}
              className="hover:opacity-80"
            />
          ) : null}
          <Link href="/signup" className={listClass}>
            List a property
          </Link>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/signup" className={listClass}>
            <span className="sm:hidden">List</span>
            <span className="hidden sm:inline">List a property</span>
          </Link>
          <details key={pathname} className="relative">
            <summary className={menuClass}>Menu</summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 z-30 mt-2 w-64 border border-line bg-surface p-2 text-ink"
            >
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "block px-3 py-2.5 text-sm font-semibold hover:bg-stone"
                        : "block px-3 py-2.5 text-sm hover:bg-stone"
                    }
                  >
                    {link.label}
                  </Link>
                );
              })}
              <ResourcesNav key={pathname} variant="mobile" />
              {signedIn ? null : (
                <Link href={signIn.href} className="block px-3 py-2.5 text-sm hover:bg-stone">
                  {signIn.label}
                </Link>
              )}
              {signedIn ? (
                <AccountLinks
                  href={accountHref}
                  label={accountLabel}
                  hydrated={hydrated}
                  className="block w-full px-3 py-2.5 text-left text-sm hover:bg-stone"
                />
              ) : null}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}

function AccountLinks({
  href,
  label,
  hydrated,
  className,
}: {
  href: string;
  label: string;
  hydrated: boolean;
  className: string;
}) {
  return (
    <>
      <Link href={href} className={className}>
        {label}
      </Link>
      <form method="post" action="/sign-out">
        <button type="submit" disabled={!hydrated} className={className}>
          Sign out
        </button>
      </form>
    </>
  );
}
