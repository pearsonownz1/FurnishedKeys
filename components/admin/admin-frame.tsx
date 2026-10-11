"use client";

import Link from "next/link";
import { Home, LayoutGrid, MessageSquare, ShieldCheck, UserPlus, Users } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell, type ShellLink } from "@/components/shell/app-shell";
import type { AdminStaff } from "@/lib/admin-staff";

export function AdminFrame({
  staff,
  reviewCount,
  leadCount,
  children,
}: {
  staff: AdminStaff;
  reviewCount: number;
  leadCount: number;
  children: ReactNode;
}) {
  const items: ShellLink[] = [
    { href: "/admin", label: "Overview", icon: LayoutGrid, exact: true },
    {
      href: "/admin/review",
      label: "Review queue",
      shortLabel: "Review",
      icon: ShieldCheck,
      badge: reviewCount > 0 ? reviewCount : undefined,
    },
    { href: "/admin/listings", label: "Listings", icon: Home },
    {
      href: "/admin/leads",
      label: "Owner leads",
      shortLabel: "Leads",
      icon: UserPlus,
      badge: leadCount > 0 ? leadCount : undefined,
    },
    { href: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
    { href: "/admin/users", label: "Users", icon: Users },
  ];

  return (
    <AppShell
      navLabel="Admin"
      items={items}
      phoneItems={items.slice(0, 4)}
      moreItems={items.slice(4)}
      user={staff}
      mark="ADMIN"
      topLink={{ href: "/owner", label: "Owner view" }}
      footer={
        <Link
          href="/"
          className="mt-auto border border-line px-3 py-2.5 text-center font-medium text-muted"
        >
          View site <span aria-hidden="true">↗</span>
        </Link>
      }
    >
      {children}
    </AppShell>
  );
}
