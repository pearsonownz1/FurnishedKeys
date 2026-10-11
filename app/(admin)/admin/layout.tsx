import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AdminFrame } from "@/components/admin/admin-frame";
import { loadAdminCounts } from "@/lib/admin-load";
import { loadAdminStaff } from "@/lib/admin-staff";

const FORBIDDEN = "NEXT_HTTP_ERROR_FALLBACK;403";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="h-dvh bg-bg" />}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

function isForbidden(error: unknown): boolean {
  return typeof error === "object" && error !== null && "digest" in error && error.digest === FORBIDDEN;
}

async function Frame({ children }: { children: ReactNode }) {
  await connection();
  const gate = await openConsole();
  if (!gate.ok) {
    return (
      <main id="content" className="bg-bg px-5 py-16 text-sm text-ink">
        <h1 className="font-serif text-4xl font-normal">Not authorized</h1>
        <p className="mt-3 text-muted">This page is for Furnished Keys staff.</p>
      </main>
    );
  }
  return (
    <AdminFrame staff={gate.staff} reviewCount={gate.counts.review_waiting} leadCount={gate.counts.leads_new}>
      {children}
    </AdminFrame>
  );
}

async function openConsole() {
  try {
    const counts = await loadAdminCounts();
    const staff = await loadAdminStaff();
    return { ok: true as const, counts, staff };
  } catch (error) {
    // A thrown forbidden() inside this Suspense boundary replaces the shell with an empty fallback.
    // The loader still rejects non-admins; show the staff page from that digest.
    if (!isForbidden(error)) throw error;
    return { ok: false as const };
  }
}
