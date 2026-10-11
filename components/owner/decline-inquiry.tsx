"use client";

import { declineInquiry } from "@/app/(site)/owner/actions";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

export function DeclineInquiryButton({
  inquiryId,
  onDeclined,
}: {
  inquiryId: string;
  onDeclined: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(async (previous: Awaited<ReturnType<typeof declineInquiry>> | null, formData: FormData) => {
    const result = await declineInquiry(previous ?? { ok: false }, formData);
    if (result.ok) {
      onDeclined();
      router.refresh();
    }
    return result;
  }, null);

  return (
    <form action={formAction} className="shrink-0 text-right">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      <button
        type="submit"
        disabled={pending}
        className="border border-line px-3.5 py-2 text-[13px] font-semibold disabled:opacity-70"
      >
        Decline
      </button>
      {state?.formError ? (
        <p className="mt-1 max-w-40 text-xs text-warn" role="alert">
          {state.formError}
        </p>
      ) : null}
      {state?.success ? <p className="mt-1 text-xs text-pine">Declined</p> : null}
    </form>
  );
}
