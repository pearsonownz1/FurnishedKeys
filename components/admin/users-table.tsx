import { AdminPage, RecordCell, RecordTable, RecordTabs } from "@/components/admin/record-table";
import { monthDay } from "@/lib/owner-dashboard";
import type { AdminUser, UserTab } from "@/lib/admin-console";

const tabs: { id: UserTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "owner", label: "Owners" },
  { id: "renter", label: "Renters" },
];

export function UsersTable({
  users,
  counts,
  tab,
}: {
  users: AdminUser[];
  counts: Record<UserTab, number>;
  tab: UserTab;
}) {
  return (
    <AdminPage title="Users" subtitle="Owners and renters on Furnished Keys.">
      <RecordTabs
        tabs={tabs.map((item) => ({
          href: item.id === "all" ? "/admin/users" : `/admin/users?role=${item.id}`,
          label: item.label,
          count: counts[item.id],
          on: tab === item.id,
        }))}
      />
      <RecordTable columns={["Name", "Email", "Role", "Joined", "Listings", "Inquiries"]}>
        {users.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-3.5 py-6 text-muted">
              No users in this view.
            </td>
          </tr>
        ) : (
          users.map((user) => (
            <tr key={user.id}>
              <RecordCell className="font-semibold">{user.name}</RecordCell>
              <RecordCell>{user.email || "—"}</RecordCell>
              <RecordCell>{user.role === "owner" ? "Owner" : "Renter"}</RecordCell>
              <RecordCell>
                <time dateTime={user.joinedAt}>{monthDay(user.joinedAt)}</time>
              </RecordCell>
              <RecordCell>{user.listingCount}</RecordCell>
              <RecordCell>{user.inquiryCount}</RecordCell>
            </tr>
          ))
        )}
      </RecordTable>
    </AdminPage>
  );
}
