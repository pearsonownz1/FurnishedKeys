import { connection } from "next/server";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Forgot password",
  description: "Email yourself a link to choose a new password.",
};

type Search = Record<string, string | string[] | undefined>;

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Forgot searchParams={searchParams} />
    </Suspense>
  );
}

async function Forgot({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const notice = params.error === "link" ? "That link didn't work. Request a new one." : "";

  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <ForgotPasswordForm notice={notice} />
    </div>
  );
}
