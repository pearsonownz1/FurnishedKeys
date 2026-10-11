import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { OwnerFrame } from "@/components/owner/owner-frame";
import { loadOwnerDashboard } from "@/lib/owner-dashboard-load";

export default function OwnerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="h-dvh bg-bg" />}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: ReactNode }) {
  await connection();
  const dashboard = await loadOwnerDashboard();
  if (!dashboard.signedIn) redirect("/sign-in?next=%2Fowner%2Flistings");
  return (
    <OwnerFrame owner={dashboard.owner} unread={dashboard.unread} locationId={dashboard.locationId}>
      {children}
    </OwnerFrame>
  );
}
