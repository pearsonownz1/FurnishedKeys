import { connection } from "next/server";
import { Suspense } from "react";
import { Overview } from "@/components/admin/overview";
import { loadAdminCounts, loadRecentActivity, loadReviewQueue } from "@/lib/admin-load";
import { loadAdminStaff } from "@/lib/admin-staff";
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
  const [staff, counts, queue, activity] = await Promise.all([
    loadAdminStaff(),
    loadAdminCounts(),
    loadReviewQueue(),
    loadRecentActivity(20),
  ]);
  return <Overview name={staff.name} counts={counts} queue={queue} activity={activity} now={new Date()} />;
}
