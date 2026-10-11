import { connection } from "next/server";
import { Suspense } from "react";
import { StartForm } from "@/components/listing/start-form";
import { sanitizeSource } from "@/lib/leads";
import { activeLocations, locationShort } from "@/lib/locations";

export const metadata = {
  title: "List a property",
  description: "Start a furnished listing. The fee is billed yearly.",
};

type Search = Record<string, string | string[] | undefined>;

export default function StartPage({ searchParams }: { searchParams: Promise<Search> }) {
  return (
    <Suspense fallback={<p className="px-5 py-16 text-muted">Loading…</p>}>
      <Start searchParams={searchParams} />
    </Suspense>
  );
}

async function Start({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const params = await searchParams;
  const raw = params.src;
  const source = sanitizeSource(Array.isArray(raw) ? raw[0] : raw);
  const places = activeLocations().map((location) => ({
    id: location.id,
    label: locationShort(location),
  }));

  return <StartForm places={places} source={source} />;
}
