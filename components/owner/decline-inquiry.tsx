"use client";

import { declineInquiry } from "@/app/(owner)/owner/actions";
import { useState } from "react";

export function DeclineInquiryButton({ inquiryId }: { inquiryId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function decline() {
    setPending(true);
    const result = await declineInquiry(inquiryId);
    setMessage(result.formError);
    setPending(false);
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={() => void decline()}
        disabled={pending}
        className="border border-line px-3.5 py-2 text-[13px] font-semibold disabled:opacity-70"
      >
        Decline
      </button>
      {message ? (
        <p className="mt-1 max-w-40 text-xs text-warn" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
