"use client";

import Link from "next/link";
import { useState } from "react";
import { DeclineInquiryButton } from "@/components/owner/decline-inquiry";
import { InquiryComposer } from "@/components/owner/inquiry-composer";
import { InquiryThread } from "@/components/owner/inquiry-thread";
import { inquiryStatusLabel } from "@/lib/owner-board";
import { inquiryStatusTone, type DashboardInquiry } from "@/lib/owner-dashboard";

export function InquiryDetail({ inquiry }: { inquiry: DashboardInquiry }) {
  const [status, setStatus] = useState(inquiry.status);
  const mailto = mailHref(inquiry.email);
  const tel = inquiry.phone ? phoneHref(inquiry.phone) : null;

  return (
    <>
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 md:px-6">
        <div className="min-w-0">
          <p className="font-semibold">
            {inquiry.name}{" "}
            <span className={`ml-1.5 inline-block px-2 py-0.5 align-middle text-[11px] font-semibold ${inquiryStatusTone(status)}`}>
              {inquiryStatusLabel(status)}
            </span>
          </p>
          <div className="mt-1 flex flex-wrap gap-x-[18px] gap-y-1 text-[13px] text-muted">
            <span>{inquiry.dateLabel}</span>
            <span>{inquiry.occupantLabel}</span>
            <span>{inquiry.petsLabel}</span>
            {mailto ? (
              <a href={mailto} className="break-all text-pine">
                {inquiry.email}
              </a>
            ) : (
              <span className="break-all">{inquiry.email}</span>
            )}
            {inquiry.phone ? (
              tel ? (
                <a href={tel} className="text-pine">
                  {inquiry.phone}
                </a>
              ) : (
                <span>{inquiry.phone}</span>
              )
            ) : null}
          </div>
        </div>
        <DeclineInquiryButton inquiryId={inquiry.id} onDeclined={() => setStatus("declined")} />
      </header>
      <Link href="/owner/inquiries" className="border-b border-line px-4 py-2 text-sm font-semibold text-pine md:hidden">
        Back
      </Link>
      <InquiryThread messages={inquiry.messages} />
      <InquiryComposer
        inquiryId={inquiry.id}
        firstName={inquiry.firstName}
        onSent={() => setStatus("responded")}
      />
    </>
  );
}

function mailHref(email: string): string | null {
  const trimmed = email.trim();
  if (!/^[^\s<>]+@[^\s<>]+$/.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}

function phoneHref(phone: string): string | null {
  const compact = phone.trim().replace(/[^\d+]/g, "");
  if (!/^\+?\d{7,15}$/.test(compact)) return null;
  return `tel:${compact}`;
}
