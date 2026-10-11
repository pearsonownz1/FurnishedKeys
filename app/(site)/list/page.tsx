import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sanitizeSource } from "@/lib/leads";

type Search = Record<string, string | string[] | undefined>;

export default function ListPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={null}>
      <RedirectToStart searchParams={searchParams} />
    </Suspense>
  );
}

async function RedirectToStart({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.src;
  const source = sanitizeSource(Array.isArray(raw) ? raw[0] : raw);
  redirect(source ? `/owners/start?src=${encodeURIComponent(source)}` : "/owners/start");
  return null;
}
