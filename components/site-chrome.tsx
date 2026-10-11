"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === "/owner" || pathname.startsWith("/owner/")) return children;
  return (
    <>
      {header}
      <main id="content" className="flex-1">
        {children}
      </main>
      {footer}
    </>
  );
}
