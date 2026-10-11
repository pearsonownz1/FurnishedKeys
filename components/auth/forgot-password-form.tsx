"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/(site)/forgot-password/actions";
import { useHydrated } from "@/components/auth/use-hydrated";
import type { PasswordResetState } from "@/lib/auth-mail";

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

const empty: PasswordResetState = { ok: false };

export function ForgotPasswordForm({ notice }: { notice: string }) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(requestPasswordReset, empty);

  if (state.success) {
    return (
      <p role="status" className="max-w-xl text-[17px] leading-relaxed">
        If that email has an account, we sent a reset link.
      </p>
    );
  }

  return (
    <form action={action} method="post" noValidate className="max-w-md">
      <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
        Forgot password
      </h1>
      <p className="mt-5 text-[17px] leading-relaxed text-muted">
        We&apos;ll email you a link to choose a new password.
      </p>
      {notice ? (
        <p className="mt-5 text-sm text-warn" role="alert">
          {notice}
        </p>
      ) : null}
      <label className="mt-8 grid gap-1 text-sm">
        Email
        <input
          className={fieldClass}
          type="email"
          name="email"
          autoComplete="email"
          required
        />
      </label>
      {state.fieldErrors?.email ? (
        <p className="mt-3 text-sm text-warn" role="alert">
          {state.fieldErrors.email}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!hydrated || pending}
        className="mt-6 rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        Email me a reset link
      </button>
    </form>
  );
}
