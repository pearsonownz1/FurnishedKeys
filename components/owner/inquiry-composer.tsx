"use client";

import { replyToInquiry } from "@/app/(owner)/owner/actions";
import type { ReplyActionState } from "@/lib/owner-reply";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

const empty: ReplyActionState = { ok: false };

export function InquiryComposer({
  inquiryId,
  firstName,
  onSent,
}: {
  inquiryId: string;
  firstName: string;
  onSent: () => void;
}) {
  const router = useRouter();
  const [draftKey, setDraftKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (previous: ReplyActionState, formData: FormData) => {
      const result = await replyToInquiry(previous, formData);
      if (result.success) {
        setDraftKey((key) => key + 1);
        onSent();
        router.refresh();
      }
      return result;
    },
    empty,
  );
  const hint = `${firstName} gets it by email.`;

  return (
    <form action={formAction} className="flex flex-col gap-3 border-t border-line px-4 py-3.5 sm:flex-row sm:items-end sm:px-6">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <div className="min-w-0 flex-1">
        <label htmlFor={`reply-${inquiryId}`} className="sr-only">
          Reply
        </label>
        <textarea
          key={draftKey}
          id={`reply-${inquiryId}`}
          name="body"
          required
          minLength={1}
          maxLength={8000}
          rows={2}
          placeholder={`Write a reply… ${hint}`}
          className="w-full resize-none border border-line px-3 py-2.5 text-base placeholder:text-[#9a958b]"
        />
        {state.formError ? (
          <p className="mt-1 text-sm text-warn" role="alert">
            {state.formError}
          </p>
        ) : null}
        {state.success ? (
          <p className="mt-1 text-sm text-ok" role="status">
            Reply sent
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-pine px-3.5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-70 sm:mb-px"
      >
        Send
      </button>
    </form>
  );
}
