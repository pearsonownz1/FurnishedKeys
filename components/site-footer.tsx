import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { brand } from "@/lib/brand";
import { aboutPage } from "@/lib/about-copy";
import { footerColumns } from "@/lib/content/nav";
import { getPublicListings } from "@/lib/listings";
import { ownersRegionName } from "@/lib/owners-copy";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="shell pt-14 lg:pt-16">
        <BrandLockup href="/" iconSize={24} className="text-[22px] sm:text-[26px]" />
      </div>
      <div className="shell grid gap-10 py-10 sm:grid-cols-3 lg:pb-16">
        {footerColumns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-xs tracking-[0.14em] text-muted uppercase">{column.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith("mailto:") ? (
                    <a href={link.href} className="hover:text-pine">
                      {link.label}
                    </a>
                  ) : (
                    <Link href={link.href} className="hover:text-pine">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="shell flex flex-col gap-3 py-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 {brand.name} · {ownersRegionName()} ·{" "}
            <a href={`mailto:${aboutPage.email}`} className="hover:text-ink">
              {aboutPage.email}
            </a>
          </p>
          <Suspense fallback={null}>
            <DemoNote />
          </Suspense>
        </div>
      </div>
    </footer>
  );
}

async function DemoNote() {
  await connection();
  let showing = false;
  try {
    const listings = await getPublicListings();
    showing = listings.some((listing) => listing.is_demo);
  } catch {
    showing = false;
  }
  if (!showing) return null;
  return <p>Demo listings shown during development</p>;
}
