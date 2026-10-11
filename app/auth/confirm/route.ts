import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

const otpTypes = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

function isOtpType(value: string | null): value is EmailOtpType {
  return value != null && otpTypes.has(value as EmailOtpType);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  const supabase = await createClient();

  // Recovery links land here, then the owner chooses a password. Other token
  // types still confirm an existing account and follow `next`.
  const destination = type === "recovery" ? "/reset-password" : next;
  if (tokenHash && isOtpType(type)) {
    const verified = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!verified.error) redirect(destination);
  } else if (code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (!exchanged.error) redirect(destination);
  }

  if (type === "recovery") redirect("/forgot-password?error=link");
  redirect(`/sign-in?error=link&next=${encodeURIComponent(next)}`);
}
