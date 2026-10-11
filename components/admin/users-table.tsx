import { AdminPage, RecordCell, RecordTable, RecordTabs } from "@/components/admin/record-table";
import type { AdminUserRow } from "@/lib/admin-load";
import { monthDay } from "@/lib/owner-dashboard";
import { relativeTime, roleLabel } from "@/lib/admin-present";

const tabs = [
  { id: "all", label: "All" },
  { id: "owner", label: "Owners" },
  { id: "renter", label: "Renters" },
] as const;

export function UsersTable({
  users,
  tab,
  now,
}: {
  users: AdminUserRow[];
  tab: "all" | "owner" | "renter";
  now: Date;
}) {
  const counts = {
    all: users.length,
    owner: users.filter((user) => user.role === "owner").length,
    renter: users.filter((user) => user.role === "renter").length,
  };
  const visible = tab === "all" ? users : users.filter((user) => user.role === tab);

  return (
    <AdminPage title="Users" subtitle="Accounts on Furnished Keys.">
      <RecordTabs
        tabs={tabs.map((item) => ({
          href: item.id === "all" ? "/admin/users" : `/admin/users?role=${item.id}`,
          label: item.label,
          count: counts[item.id],
          on: tab === item.id,
        }))}
      />
      <RecordTable columns={["Name", "Email", "Role", "Listings", "Joined", "Last sign-in"]}>
        {visible.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3.5 py-6 text-muted">
              No users in this view.
            </td>
          </tr>
        ) : (
          visible.map((user) => (
            <tr key={user.id}>
              <RecordCell className="font-semibold">{user.full_name?.trim() || "—"}</RecordCell>
              <RecordCell>{user.email || "—"}</RecordCell>
              <RecordCell>{roleLabel(user.role)}</RecordCell>
              <RecordCell>{user.listings_count}</RecordCell>
              <RecordCell>
                <time dateTime={user.created_at}>{monthDay(user.created_at)}</time>
              </RecordCell>
              <RecordCell>
                {user.last_sign_in_at ? (
                  <time dateTime={user.last_sign_in_at}>{relativeTime(user.last_sign_in_at, now)}</time>
                ) : (
                  "—"
                )}
              </RecordCell>
            </tr>
          ))
        )}
      </RecordTable>
    </AdminPage>
  );
}
