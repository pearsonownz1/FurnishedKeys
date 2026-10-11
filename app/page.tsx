import { brand } from "@/lib/brand";
import { launchKicker, locationPlace, primaryLocation } from "@/lib/locations";

export default function Home() {
  const market = primaryLocation();

  return (
    <main id="content" className="shell flex flex-1 flex-col justify-center py-24">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">
        {launchKicker(market)}
      </p>
      <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-none tracking-tight sm:text-6xl">
        {brand.headline[0]}{" "}
        <em className="italic">{brand.headline[1]}</em>
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink">{brand.subline}</p>
      <p className="mt-10 text-sm text-muted">{locationPlace(market)}</p>
    </main>
  );
}
