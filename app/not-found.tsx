import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { Suspense } from "react";
import { AccountHeader } from "@/components/account-header";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
  ...canonical("/"),
};

export default function NotFound() {
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-line bg-surface" />}>
        <AccountHeader />
      </Suspense>
      <main id="content" className="shell flex-1 py-20">
        <h1 className="font-serif text-5xl font-normal tracking-tight">
          That page is not here
        </h1>
        <p className="mt-4 text-muted">
          <Link href="/" className="font-semibold text-pine">
            Back home
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
