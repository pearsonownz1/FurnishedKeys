import { connection } from "next/server";
import { Suspense } from "react";
import { Overview } from "@/components/admin/overview";
import { loadAdminConsole } from "@/lib/admin-console-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Admin",
  description: "What needs attention on Furnished Keys today.",
  ...canonical("/admin"),
};

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen />
    </Suspense>
  );
}

async function Screen() {
  await connection();
  const gate = await loadAdminConsole();
  if (gate.kind !== "ready") return null;
  return <Overview data={gate.data} now={new Date()} />;
}
