"use client";

import { useState, type FormEvent } from "react";
import { useHydrated } from "@/components/auth/use-hydrated";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPasswordForm({ notice }: { notice: string }) {
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!emailPattern.test(address)) {
      setFieldError("Add a valid email.");
      return;
    }
    setPending(true);
    setFieldError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });
      if (error) console.error("forgot-password", error.message);
    } catch (error) {
      console.error("forgot-password", error);
    }
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="max-w-xl text-[17px] leading-relaxed">
        If that email has an account, we sent a reset link.
      </p>
    );
  }

  return (
    <form method="post" onSubmit={(event) => void submit(event)} noValidate className="max-w-md">
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {fieldError ? (
        <p className="mt-3 text-sm text-warn" role="alert">
          {fieldError}
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
