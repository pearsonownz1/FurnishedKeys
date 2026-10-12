import { describe, expect, it } from "vitest";
import { assessmentCalendlyUrl } from "./calendly";

describe("assessmentCalendlyUrl", () => {
  it("prefills name and email and styles the widget", () => {
    const url = new URL(
      assessmentCalendlyUrl({
        name: "Ada Lovelace",
        email: "ada@example.com",
        campaign: "letter",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://calendly.com/hello-furnishedkeys/30min");
    expect(url.searchParams.get("name")).toBe("Ada Lovelace");
    expect(url.searchParams.get("email")).toBe("ada@example.com");
    expect(url.searchParams.get("hide_gdpr_banner")).toBe("1");
    expect(url.searchParams.get("background_color")).toBe("ffffff");
    expect(url.searchParams.get("primary_color")).toBe("2e4a3b");
    expect(url.searchParams.get("text_color")).toBe("1b1e1c");
    expect(url.searchParams.get("utm_source")).toBe("furnishedkeys");
    expect(url.searchParams.get("utm_medium")).toBe("assessment");
    expect(url.searchParams.get("utm_campaign")).toBe("letter");
    expect(url.search).toContain("Ada%20Lovelace");
  });

  it("omits empty name or email and defaults the campaign to site", () => {
    const url = new URL(assessmentCalendlyUrl({ name: "  ", email: "", campaign: "" }));
    expect(url.searchParams.has("name")).toBe(false);
    expect(url.searchParams.has("email")).toBe(false);
    expect(url.searchParams.get("utm_campaign")).toBe("site");
    expect(url.searchParams.get("hide_gdpr_banner")).toBe("1");
  });
});
