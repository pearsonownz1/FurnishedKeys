import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth-redirect";
import { continuePath, destinationFor, failureFor, readOtpLink } from "@/lib/auth-confirm";
import { createClient } from "@/lib/supabase/server";

function to(path: string, request: Request) {
  // 303 so a POST lands on the next page as a GET.
  return NextResponse.redirect(new URL(path, request.url), 303);
}

// Email links are one-time. Mail scanners, chat link previews, and prefetchers
// open them with a GET, so GET never spends a token_hash. It sends the person to
// a Continue page, and only that page's POST verifies the token.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const next = safeNext(params.get("next"));
  const type = params.get("type");

  const link = readOtpLink((key) => params.get(key));
  if (link) return to(continuePath(link), request);

  // PKCE codes only work in the browser that holds the code verifier cookie,
  // so a scanner can't use one.
  const code = params.get("code");
  if (code) {
    const supabase = await createClient();
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (!exchanged.error) return to(type === "recovery" ? "/reset-password" : next, request);
    console.error("auth-confirm code", exchanged.error.code ?? exchanged.error.message);
  }

  return to(failureFor(type, next), request);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const read = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : null;
  };
  const link = readOtpLink(read);
  if (!link) return to(failureFor(read("type"), safeNext(read("next"))), request);

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({ type: link.type, token_hash: link.tokenHash });
  if (verified.error) {
    console.error("auth-confirm verify", verified.error.code ?? verified.error.message);
    return to(failureFor(link.type, link.next), request);
  }
  return to(destinationFor(link), request);
}
