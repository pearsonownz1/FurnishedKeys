import { connection } from "next/server";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { sanitizeSource } from "@/lib/leads";
import { activeLocations, locationShort } from "@/lib/locations";
import { canonical } from "@/lib/site";

export const metadata = {
  title: "Create account",
  description: "Free to list. We only earn when you rent.",
  ...canonical("/signup"),
};

type Search = Record<string, string | string[] | undefined>;

export default function SignupPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Signup searchParams={searchParams} />
    </Suspense>
  );
}

async function Signup({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.src;
  const source = sanitizeSource(Array.isArray(raw) ? raw[0] : raw);
  const places = activeLocations().map((location) => ({
    id: location.id,
    label: locationShort(location),
  }));

  return (
    <div className="shell max-w-3xl py-14 lg:py-20">
      <SignupForm places={places} source={source} />
    </div>
  );
}
