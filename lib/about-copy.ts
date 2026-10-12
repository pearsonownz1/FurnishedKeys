import { brand } from "@/lib/brand";
import { SITE_ORIGIN } from "@/lib/site";

export const founder = {
  name: "Lindsey Pearson",
  role: "Founder · Licensed Real Estate Broker",
  imageSrc: "/about/lindsey-pearson-bw.webp",
  imageAlt: `Lindsey Pearson, founder of ${brand.name}`,
  bio: `Lindsey has spent more than 20 years in real estate and property management, serving owners and renters across Portland and Central Oregon. ${brand.name} connects the people who need a furnished place for a few months, like traveling professionals, relocating families and contract workers, with local owners who have ADUs and spare homes.`,
  answerLead: `${brand.name} is her answer. Owners list for free and decide who stays and when, and renters deal directly with the person who owns the place. For owners who'd rather hand it off, `,
  managementLink: "ask us about full management",
  managementHref: "/management",
  license: "Licensed in Oregon with eXp Realty, #201238658.",
} as const;

export function founderJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: founder.name,
    jobTitle: "Founder",
    worksFor: {
      "@type": "Organization",
      name: brand.name,
    },
    image: new URL(founder.imageSrc, SITE_ORIGIN).toString(),
    areaServed: ["Portland", "Central Oregon"],
  };
}

export const aboutPage = {
  title: "About Furnished Keys | Furnished homes. Flexible stays.",
  description:
    "Furnished Keys connects people who need a furnished home for a few months with local owners, starting in Bend and Deschutes County.",
  heroTitle: "Furnished homes. Flexible stays.",
  heroBody:
    "We help people find a furnished place for their next chapter, and help local owners rent theirs out by the month.",
  why: [
    "Not every move fits a year-long lease. People come to Central Oregon for a contract, a new job, a season on the mountain, or the months between selling one home and moving into the next. They need somewhere furnished, ready, and honest about the full monthly cost.",
    "At the same time, plenty of owners have an ADU, a spare unit, or a second home that could rent by the month. They just need an easy way to reach the right renters.",
    "Furnished Keys brings the two together.",
  ],
  how: [
    {
      title: "Owner-approved listings only.",
      body: "We publish a place only after its owner submits and approves it, and we review every listing before it goes live.",
    },
    {
      title: "The full cost, up front.",
      body: "Rent, utilities, deposits, and other fees each get their own line.",
    },
    {
      title: "Dates you can trust.",
      body: "Every listing shows when its availability was last confirmed.",
    },
    {
      title: "Free to list.",
      body: "Owners pay nothing to list. We only earn when a place rents.",
    },
  ],
  where:
    "We're starting in Bend and across Deschutes County, with more of the Northwest to follow.",
  contactLead: "Questions? Email us at",
  email: "hello@furnishedkeys.com",
} as const;
