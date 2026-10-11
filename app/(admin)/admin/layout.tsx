import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AdminFrame } from "@/components/admin/admin-frame";
import { loadAdminConsole } from "@/lib/admin-console-load";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="h-dvh bg-bg" />}>
      <Frame>{children}</Frame>
    </Suspense>
  );
}

async function Frame({ children }: { children: ReactNode }) {
  await connection();
  const gate = await loadAdminConsole();
  if (gate.kind === "signed-out") redirect("/sign-in?next=%2Fadmin");
  if (gate.kind === "forbidden") {
    return (
      <main id="content" className="px-5 py-16">
        <p className="text-sm">Not authorized</p>
      </main>
    );
  }
  return (
    <AdminFrame staff={gate.data.staff} reviewCount={gate.data.waiting} leadCount={gate.data.newLeads}>
      {children}
    </AdminFrame>
  );
}
