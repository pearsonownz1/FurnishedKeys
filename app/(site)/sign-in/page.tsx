import { connection } from "next/server";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { requestedNext } from "@/lib/auth-redirect";

export const metadata = {
  title: "Sign in",
  description: "Sign in with your email and password.",
};

type Search = Record<string, string | string[] | undefined>;

export default function SignInPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <SignIn searchParams={searchParams} />
    </Suspense>
  );
}

async function SignIn({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.next;
  const next = requestedNext(Array.isArray(raw) ? raw[0] : raw);
  const notice =
    params.error === "link" ? "That link didn't work. Request a new one from forgot password." : "";

  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <SignInForm next={next} notice={notice} />
    </div>
  );
}
