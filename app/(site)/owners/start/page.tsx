import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sanitizeSource } from "@/lib/leads";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "List your property",
  ...canonical("/owners/start"),
};

type Search = Record<string, string | string[] | undefined>;

export default function StartPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={null}>
      <RedirectToSignup searchParams={searchParams} />
    </Suspense>
  );
}

async function RedirectToSignup({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.src;
  const source = sanitizeSource(Array.isArray(raw) ? raw[0] : raw);
  redirect(source ? `/signup?src=${encodeURIComponent(source)}` : "/signup");
  return null;
}
