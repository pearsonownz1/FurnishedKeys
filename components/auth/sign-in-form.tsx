"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useHydrated } from "@/components/auth/use-hydrated";
import { safeNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm({ next, notice }: { next: string; notice: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const destination = safeNext(next);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!emailPattern.test(address) || password.length < 8) {
      setFieldError("Add your email and password.");
      return;
    }
    setPending(true);
    setFieldError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: address,
        password,
      });
      if (error) {
        console.error("sign-in", error.message);
        setFieldError("Email or password is incorrect.");
        setPending(false);
        return;
      }
    } catch (error) {
      console.error("sign-in", error);
      setFieldError("Email or password is incorrect.");
      setPending(false);
      return;
    }
    router.push(destination);
  }

  return (
    <form method="post" onSubmit={(event) => void submit(event)} noValidate className="max-w-md">
      <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
        Sign in
      </h1>
      <p className="mt-5 text-[17px] leading-relaxed text-muted">
        Use the email and password from your listing.
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
      <label className="mt-4 grid gap-1 text-sm">
        Password
        <input
          className={fieldClass}
          type="password"
          name="password"
          autoComplete="current-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
        Sign in
      </button>
      <p className="mt-4 text-sm">
        <Link href="/forgot-password" className="font-semibold text-pine">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
