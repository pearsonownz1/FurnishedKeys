import { connection } from "next/server";
import { Suspense } from "react";
import { OwnerSettingsForm } from "@/components/owner/owner-settings-form";
import { loadOwnerDashboard } from "@/lib/owner-dashboard-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Settings",
  description: "Profile, password, and email notifications.",
  ...canonical("/owner/settings"),
};

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  await connection();
  const dashboard = await loadOwnerDashboard();
  return <OwnerSettingsForm owner={dashboard.owner} />;
}
