import { connection } from "next/server";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { createClient } from "@/lib/supabase/server";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Reset password",
  description: "Choose a new password for your account.",
  ...canonical("/reset-password"),
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Reset />
    </Suspense>
  );
}

async function Reset() {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <ResetPasswordForm hasSession={Boolean(data.user)} />
    </div>
  );
}
