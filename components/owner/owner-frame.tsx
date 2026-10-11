"use client";

import { CalendarDays, Home, MessageSquare, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { NewListingButton } from "@/components/owner/new-listing-button";
import { AppShell, type ShellLink } from "@/components/shell/app-shell";
import type { DashboardOwner } from "@/lib/owner-dashboard";

export function OwnerFrame({
  owner,
  unread,
  locationId,
  children,
}: {
  owner: DashboardOwner;
  unread: number;
  locationId: string;
  children: ReactNode;
}) {
  const items: ShellLink[] = [
    { href: "/owner/listings", label: "Listings", icon: Home },
    {
      href: "/owner/inquiries",
      label: "Inquiries",
      icon: MessageSquare,
      badge: unread > 0 ? unread : undefined,
    },
    { href: "/owner/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/owner/settings", label: "Settings", icon: Settings },
  ];

  return (
    <AppShell
      navLabel="Owner"
      items={items}
      phoneItems={items}
      user={owner}
      topLink={{ href: "/", label: "View site" }}
      footer={
        <NewListingButton
          locationId={locationId}
          className="mt-auto border border-pine py-2.5 text-center font-semibold text-pine"
        />
      }
    >
      {children}
    </AppShell>
  );
}
