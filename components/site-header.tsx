import Link from "next/link";

const links = [
  { href: "/rentals", label: "Find a home" },
  { href: "/list", label: "List your property" },
  { href: "/management", label: "Management" },
  { href: "/sign-in", label: "Sign in" },
] as const;

export function SiteHeader({ tone = "solid" }: { tone?: "overlay" | "solid" }) {
  const overlay = tone === "overlay";
  const listClass = overlay
    ? "rounded-[2px] border border-white/70 px-3.5 py-2 text-sm"
    : "rounded-[2px] border border-pine px-3.5 py-2 text-sm text-pine";
  const menuClass = overlay
    ? "cursor-pointer rounded-[2px] border border-white/70 px-3 py-2 text-sm"
    : "cursor-pointer rounded-[2px] border border-line bg-surface px-3 py-2 text-sm";

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-20 text-white"
          : "border-b border-line bg-bg text-ink"
      }
    >
      <div className="shell flex h-[72px] items-center justify-between gap-3">
        <Link
          href="/"
          className="font-serif text-[22px] tracking-[-0.3px] sm:text-[26px]"
        >
          Furnished <span className="italic">Keys</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 text-sm lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:opacity-80">
              {link.label}
            </Link>
          ))}
          <Link href="/list" className={listClass}>
            List a property
          </Link>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <Link href="/list" className={listClass}>
            <span className="sm:hidden">List</span>
            <span className="hidden sm:inline">List a property</span>
          </Link>
          <details className="relative">
            <summary className={menuClass}>Menu</summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 z-30 mt-2 w-56 border border-line bg-surface p-2 text-ink"
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2.5 text-sm hover:bg-stone"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
