import { describe, expect, it } from "vitest";
import { brand } from "./brand";
import { founder, founderJsonLd } from "./about-copy";

describe("founder", () => {
  it("uses the site brand and the approved bio", () => {
    expect(founder.name).toBe("Lindsey Pearson");
    expect(founder.role).toBe("Founder · Licensed Real Estate Broker");
    expect(founder.imageAlt).toBe(`Lindsey Pearson, founder of ${brand.name}`);
    expect(founder.bio).toContain(
      `${brand.name} connects the people who need a furnished place for a few months, like traveling professionals, relocating families and contract workers, with local owners who have ADUs and spare homes.`,
    );
    expect(founder.bio).not.toContain("started");
    expect(founder.answerLead.startsWith(`${brand.name} is her answer.`)).toBe(true);
    expect(founder.answerLead.endsWith("For owners who'd rather hand it off, ")).toBe(true);
    expect(founder.answerLead).not.toContain("Lindsey and her team");
    expect(founder.managementLink).toBe("ask us about full management");
    expect(founder.managementHref).toBe("/management");
    expect(founder.license).toBe("Licensed in Oregon with eXp Realty, #201238658.");
    expect(`${founder.bio} ${founder.answerLead}`).not.toContain("FurnishedKeys");
  });

  it("publishes person structured data", () => {
    expect(founderJsonLd()).toEqual({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Lindsey Pearson",
      jobTitle: "Founder",
      worksFor: {
        "@type": "Organization",
        name: brand.name,
      },
      image: "https://www.furnishedkeys.com/about/lindsey-pearson-bw.webp",
      areaServed: ["Portland", "Central Oregon"],
    });
  });
});
