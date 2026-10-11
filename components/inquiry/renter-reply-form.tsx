"use client";

import { renterReply, type RenterReplyState } from "@/app/(site)/inquiry/actions";
import { useActionState, useState } from "react";

const empty: RenterReplyState = { ok: false };

const fieldClass =
  "min-h-32 w-full rounded-[2px] border border-line bg-surface px-3 py-2 text-[15px]";

export function RenterReplyForm({ token }: { token: string }) {
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState(
    async (previous: RenterReplyState, formData: FormData) => {
      const result = await renterReply(previous, formData);
      if (result.ok) setBody("");
      return result;
    },
    empty,
  );

  return (
    <form action={formAction} className="mt-8 max-w-md space-y-3">
      <input type="hidden" name="token" value={token} />
      <label className="block text-sm font-semibold" htmlFor="reply-body">
        Reply
      </label>
      <textarea
        id="reply-body"
        name="body"
        required
        minLength={1}
        maxLength={8000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className={fieldClass}
      />
      {state.formError ? (
        <p className="text-sm text-warn" role="alert">
          {state.formError}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-pine">Message sent.</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
