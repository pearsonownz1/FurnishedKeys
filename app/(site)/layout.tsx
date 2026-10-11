import type { ReactNode } from "react";
import { Suspense } from "react";
import { AccountHeader } from "@/components/account-header";
import { SiteChrome } from "@/components/site-chrome";
import { SiteFooter } from "@/components/site-footer";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <SiteChrome
      header={
        <Suspense fallback={<div className="h-16 border-b border-line bg-surface" />}>
          <AccountHeader />
        </Suspense>
      }
      footer={<SiteFooter />}
    >
      {children}
    </SiteChrome>
  );
}
