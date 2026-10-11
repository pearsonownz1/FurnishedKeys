import Link from "next/link";
import { aboutPage } from "@/lib/about-copy";
import { canonical } from "@/lib/site";

export const metadata = {
  title: { absolute: aboutPage.title },
  description: aboutPage.description,
  ...canonical("/about"),
};

export default function AboutPage() {
  const breakAt = aboutPage.heroTitle.indexOf(". ");
  const heroLead = breakAt === -1 ? aboutPage.heroTitle : aboutPage.heroTitle.slice(0, breakAt + 1);
  const heroRest = breakAt === -1 ? "" : aboutPage.heroTitle.slice(breakAt + 2);

  return (
    <div>
      <section className="shell py-16 lg:py-24">
        <p className="text-xs tracking-[0.14em] text-muted uppercase">About</p>
        <h1 className="mt-4 max-w-[14ch] font-serif text-[clamp(2.75rem,6vw,4.5rem)] leading-[0.98] font-normal tracking-[-1px]">
          {heroLead} {heroRest ? <span className="text-pine italic">{heroRest}</span> : null}
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed">{aboutPage.heroBody}</p>
      </section>

      <section className="border-t border-line">
        <div className="shell grid gap-8 py-16 md:grid-cols-[420px_minmax(0,1fr)] md:py-20">
          <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.6px]">
            Why we started
          </h2>
          <div className="max-w-[40rem] space-y-4 text-[17px] leading-relaxed">
            {aboutPage.why.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="shell grid gap-8 py-16 md:grid-cols-[420px_minmax(0,1fr)] md:py-20">
          <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.6px]">
            How we work
          </h2>
          <ul className="max-w-[40rem]">
            {aboutPage.how.map((point) => (
              <li
                key={point.title}
                className="flex items-start gap-3 border-t border-line py-3 text-[15px] leading-relaxed"
              >
                <span aria-hidden="true" className="mt-[0.7em] h-px w-2.5 shrink-0 bg-pine" />
                <span>
                  <span className="font-semibold">{point.title}</span> {point.body}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="shell grid gap-8 py-16 md:grid-cols-[420px_minmax(0,1fr)] md:py-20">
          <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.6px]">
            Where we are
          </h2>
          <p className="max-w-[40rem] text-[17px] leading-relaxed">{aboutPage.where}</p>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="shell grid gap-8 py-16 md:grid-cols-[420px_minmax(0,1fr)] md:py-20">
          <h2 className="font-serif text-[clamp(2.25rem,4vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.6px]">
            Contact
          </h2>
          <div className="max-w-[40rem] text-[17px] leading-relaxed">
            <p>
              {aboutPage.contactLead}{" "}
              <a href={`mailto:${aboutPage.email}`} className="font-semibold text-pine">
                {aboutPage.email}
              </a>
              .
            </p>
            <p className="mt-4">
              Renters:{" "}
              <Link href="/rentals" className="font-semibold text-pine">
                Find a home
              </Link>
              <span aria-hidden="true"> · </span>
              Owners:{" "}
              <Link href="/owners" className="font-semibold text-pine">
                List your property
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
