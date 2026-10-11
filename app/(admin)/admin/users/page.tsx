import { connection } from "next/server";
import { Suspense } from "react";
import { UsersTable } from "@/components/admin/users-table";
import { userTab, userTabCounts } from "@/lib/admin-console";
import { loadAdminConsole } from "@/lib/admin-console-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Users",
  description: "Owners and renters on Furnished Keys.",
  ...canonical("/admin/users"),
};

type Search = Record<string, string | string[] | undefined>;

export default function UsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}

async function Screen({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const gate = await loadAdminConsole();
  if (gate.kind !== "ready") return null;
  const params = await searchParams;
  const raw = params.role;
  const tab = userTab(Array.isArray(raw) ? raw[0] : raw);
  const users = tab === "all" ? gate.data.users : gate.data.users.filter((user) => user.role === tab);
  return <UsersTable users={users} counts={userTabCounts(gate.data.users)} tab={tab} />;
}
