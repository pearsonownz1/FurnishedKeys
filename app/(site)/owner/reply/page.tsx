"use client";

import { useActionState } from "react";
import { replyToInquiry } from "@/app/(site)/owner/actions";
import type { ReplyActionState } from "@/lib/owner-reply";

const empty: ReplyActionState = { ok: false };

/** Temporary preview harness for replyToInquiry. Removed before merge. */
export default function OwnerReplyCheckPage() {
  const [state, action, pending] = useActionState(replyToInquiry, empty);
  return (
    <form action={action} className="mx-auto max-w-md px-5 py-16">
      <label className="block text-sm">
        Inquiry
        <input name="inquiryId" className="mt-1 w-full border border-line px-3 py-2" />
      </label>
      <label className="mt-4 block text-sm">
        Reply
        <textarea name="body" rows={4} className="mt-1 w-full border border-line px-3 py-2" />
      </label>
      <button type="submit" disabled={pending} className="mt-4 bg-pine px-4 py-3 font-semibold text-white">
        Send reply
      </button>
      <p data-reply-state className="mt-4 text-sm">
        {JSON.stringify(state)}
      </p>
    </form>
  );
}
