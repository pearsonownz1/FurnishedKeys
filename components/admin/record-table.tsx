import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPage({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 pb-24 md:px-10 md:pb-8">
      <h1 className="font-serif text-[40px] leading-[1.05] font-normal">{title}</h1>
      <p className="mt-1.5 text-muted">{subtitle}</p>
      {children}
    </div>
  );
}

export function RecordTabs({
  tabs,
}: {
  tabs: { href: string; label: string; count: number; on: boolean }[];
}) {
  return (
    <div className="mt-6 flex gap-5 overflow-x-auto border-b border-line">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.on ? "page" : undefined}
          className={
            tab.on
              ? "-mb-px shrink-0 border-b-2 border-ink py-2 font-medium text-ink"
              : "-mb-px shrink-0 py-2 text-muted"
          }
        >
          {tab.label} {tab.count}
        </Link>
      ))}
    </div>
  );
}

export function RecordTable({ columns, children }: { columns: string[]; children: ReactNode }) {
  return (
    <div className="mt-5 overflow-x-auto border border-line bg-white">
      <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
        <thead className="bg-bg text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-3.5 py-2.5 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function RecordCell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`border-b border-line px-3.5 py-3 align-middle ${className}`}>{children}</td>;
}
