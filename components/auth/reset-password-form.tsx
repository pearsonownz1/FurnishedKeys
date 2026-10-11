"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useHydrated } from "@/components/auth/use-hydrated";
import { dashboardForRole } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "h-[46px] w-full rounded-[2px] border border-line bg-surface px-3 text-[15px]";

export function ResetPasswordForm({ hasSession }: { hasSession: boolean }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasSession) {
    return (
      <div className="max-w-md">
        <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
          Reset password
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-muted">
          This page needs the link from your email.
        </p>
        <p className="mt-6 text-sm">
          <Link href="/forgot-password" className="font-semibold text-pine">
            Forgot password?
          </Link>
        </p>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password needs at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        console.error("reset-password", updateError.message);
        setError("We couldn't update the password. Request a new link.");
        setPending(false);
        return;
      }
      const { data } = await supabase.auth.getUser();
      const profile = data.user
        ? await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
        : null;
      router.push(dashboardForRole(profile?.data?.role));
    } catch (caught) {
      console.error("reset-password", caught);
      setError("We couldn't update the password. Request a new link.");
      setPending(false);
    }
  }

  return (
    <form method="post" onSubmit={(event) => void submit(event)} noValidate className="max-w-md">
      <h1 className="font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-normal tracking-[-0.8px]">
        Choose a new password
      </h1>
      <label className="mt-8 grid gap-1 text-sm">
        New password
        <input
          className={fieldClass}
          type="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <label className="mt-4 grid gap-1 text-sm">
        Confirm password
        <input
          className={fieldClass}
          type="password"
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </label>
      {error ? (
        <p className="mt-3 text-sm text-warn" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!hydrated || pending}
        className="mt-6 rounded-[2px] bg-pine px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        Save password
      </button>
    </form>
  );
}
