import { describe, expect, it } from "vitest";
import {
  greeting,
  interestLabel,
  leadStatusLabel,
  leadStatusParam,
  listingStatusLabel,
  relativeTime,
  submittedLabel,
} from "@/lib/admin-present";

describe("admin presentation", () => {
  const now = new Date("2026-10-11T20:00:00Z");

  it("greets from the Pacific hour", () => {
    expect(greeting(new Date("2026-10-11T18:00:00Z"), "Guy Pearson")).toBe("Good morning, Guy");
    expect(greeting(now, "Guy Pearson")).toBe("Good afternoon, Guy");
    expect(greeting(new Date("2026-01-15T04:30:00Z"), "Guy Pearson")).toBe("Good evening, Guy");
  });

  it("formats relative time and the review submission line", () => {
    expect(relativeTime(new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), now)).toBe("2h ago");
    expect(relativeTime(new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(), now)).toBe("Yesterday");
    expect(submittedLabel(new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), now)).toBe("Submitted 2h ago");
    expect(submittedLabel(null, now)).toBe("Not submitted");
  });

  it("uses the lead statuses the database stores", () => {
    expect(leadStatusParam("qualified")).toBe("qualified");
    expect(leadStatusParam("called")).toBeUndefined();
    expect(leadStatusLabel("onboarded")).toBe("Onboarded");
    expect(listingStatusLabel("archived")).toBe("Unpublished");
    expect(listingStatusLabel("approved")).toBe("Live");
    expect(interestLabel("list_myself")).toBe("List it myself");
  });
});
