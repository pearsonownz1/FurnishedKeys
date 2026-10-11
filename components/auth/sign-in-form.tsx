"use client";

import { useState, type FormEvent } from "react";
import { safeNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm({ next, notice }: { next: string; notice: string }) {
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
    const destination = safeNext(next);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(destination)}`,
        },
      });
      if (error) console.error("sign-in", error.message);
    } catch (error) {
      console.error("sign-in", error);
    }
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <div role="status">
        <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
          Check your email
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted">
          If an account exists for that address, a sign-in link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="max-w-md">
      <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
        Sign in
      </h1>
      <p className="mt-5 text-[17px] leading-relaxed text-muted">
        We&apos;ll email you a link. No password.
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
        disabled={pending}
        className="mt-6 rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        Email me a link
      </button>
    </form>
  );
}
