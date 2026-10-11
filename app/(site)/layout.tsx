import type { ReactNode } from "react";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { AccountHeader } from "@/components/account-header";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-line bg-surface" />}>
        <AccountHeader />
      </Suspense>
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
