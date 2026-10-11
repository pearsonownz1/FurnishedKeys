"use client";

import { replyToInquiry } from "@/app/(site)/owner/actions";
import type { InquiryStatus } from "@/lib/db/types";
import {
  formatMonthDayYear,
  inquiryStatusLabel,
  receivedLabel,
  type BoardInquiry,
} from "@/lib/owner-board";
import type { ReplyActionState } from "@/lib/owner-reply";
import { useActionState, useState } from "react";

const empty: ReplyActionState = { ok: false };

export function OwnerInquiryCard({ inquiry }: { inquiry: BoardInquiry }) {
  const [responded, setResponded] = useState(inquiry.status === "responded");
  const [draftKey, setDraftKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: ReplyActionState, formData: FormData) => {
      const result = await replyToInquiry(previous, formData);
      if (result.success) {
        setResponded(true);
        setDraftKey((key) => key + 1);
      }
      return result;
    },
    empty,
  );
  const status: InquiryStatus = responded ? "responded" : inquiry.status;
  const mailto = mailHref(inquiry.email);
  const tel = inquiry.phone ? phoneHref(inquiry.phone) : null;

  return (
    <article id={`inquiry-${inquiry.id}`} className="min-w-0 border border-line bg-surface px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs tracking-[0.12em] text-muted uppercase">{inquiry.listingTitle}</p>
        <span
          className={`rounded-[2px] px-2 py-0.5 text-xs font-semibold ${
            status === "responded" ? "bg-pine-l text-pine-d" : "bg-stone text-ink"
          }`}
        >
          {inquiryStatusLabel(status)}
        </span>
      </div>
      <h3 className="mt-2 font-semibold">{inquiry.name}</h3>
      <p className="mt-2 text-sm break-words">
        {mailto ? (
          <a href={mailto} className="font-semibold text-pine">
            {inquiry.email}
          </a>
        ) : (
          inquiry.email
        )}
      </p>
      <p className="mt-1 text-sm break-words">
        {inquiry.phone && tel ? (
          <a href={tel} className="font-semibold text-pine">
            {inquiry.phone}
          </a>
        ) : (
          <span className="text-muted">{inquiry.phone?.trim() || "No phone"}</span>
        )}
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-xs text-muted">Move in</dt>
          <dd>{formatMonthDayYear(inquiry.move_in)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted">Move out</dt>
          <dd>{inquiry.move_out ? formatMonthDayYear(inquiry.move_out) : "Open"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Occupants</dt>
          <dd>{inquiry.occupants}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-muted">Pets</dt>
          <dd className="break-words">{inquiry.pets?.trim() || "None"}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm leading-relaxed break-words">{inquiry.message}</p>
      <p className="mt-3 text-xs text-muted">
        Received <time dateTime={inquiry.created_at}>{receivedLabel(inquiry.created_at)}</time>
      </p>
      <form action={formAction} className="mt-4 border-t border-line pt-4">
        <input type="hidden" name="inquiryId" value={inquiry.id} />
        <label htmlFor={`reply-${inquiry.id}`} className="block text-sm font-semibold">
          Reply
        </label>
        <textarea
          key={draftKey}
          id={`reply-${inquiry.id}`}
          name="body"
          required
          minLength={1}
          maxLength={8000}
          rows={4}
          defaultValue=""
          className="mt-2 w-full rounded-[2px] border border-line px-3 py-2.5 text-base"
        />
        {state.formError ? (
          <p className="mt-2 text-sm text-warn" role="alert">
            {state.formError}
          </p>
        ) : null}
        {state.success ? (
          <p className="mt-2 text-sm text-ok" role="status">
            Reply sent
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-3 w-full rounded-[2px] bg-pine px-4 py-3 text-sm font-semibold text-white disabled:opacity-70 sm:w-auto"
        >
          Send
        </button>
      </form>
    </article>
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
