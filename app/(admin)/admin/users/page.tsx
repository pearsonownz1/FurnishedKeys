import { connection } from "next/server";
import { Suspense } from "react";
import { UsersTable } from "@/components/admin/users-table";
import { loadAdminUsers } from "@/lib/admin-load";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Users",
  description: "Accounts on Furnished Keys.",
  ...canonical("/admin/users"),
};

type Search = Record<string, string | string[] | undefined>;

function userTab(value: string | undefined): "all" | "owner" | "renter" {
  if (value === "owner" || value === "renter") return value;
  return "all";
}

export default function UsersPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Screen searchParams={searchParams} />
    </Suspense>
  );
}

async function Screen({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const [users, params] = await Promise.all([loadAdminUsers(), searchParams]);
  const raw = params.role;
  return <UsersTable users={users} tab={userTab(Array.isArray(raw) ? raw[0] : raw)} now={new Date()} />;
}
