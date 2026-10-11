import { describe, expect, it } from "vitest";
import {
  boardStatus,
  confirmationBanner,
  confirmationIsStale,
  noteRequired,
  paidOnLabel,
  queueFeeLabel,
  statusLabel,
} from "./owner-board";

describe("owner board", () => {
  it("maps listing status onto the dashboard pills", () => {
    expect(statusLabel(boardStatus("approved"))).toBe("Live");
    expect(statusLabel(boardStatus("pending_review"))).toBe("In review");
    expect(statusLabel(boardStatus("changes_requested"))).toBe("Changes requested");
    expect(statusLabel(boardStatus("draft"))).toBe("Draft");
  });

  it("raises the banner only when a confirmation is 14 days old or older", () => {
    const now = new Date("2026-10-11T00:00:00.000Z");
    expect(confirmationIsStale("2026-09-26T00:00:00.000Z", now)).toBe(true);
    expect(confirmationIsStale("2026-10-01T00:00:00.000Z", now)).toBe(false);
    expect(confirmationIsStale(null, now)).toBe(false);
    expect(
      confirmationBanner([{ lastConfirmedAt: "2026-09-01T00:00:00.000Z" }], now),
    ).toMatch(/14 days/);
    expect(confirmationBanner([{ lastConfirmedAt: "2026-10-10T00:00:00.000Z" }], now)).toBeNull();
  });

  it("formats the in-review paid date and the queue fee", () => {
    expect(paidOnLabel("2026-10-11T00:00:00.000Z")).toBe("Paid Oct 11, 2026");
    expect(queueFeeLabel("paid")).toBe("$199/yr paid");
    expect(queueFeeLabel("waived")).toBe("Waived");
    expect(queueFeeLabel("unpaid")).toBe("Unpaid");
    expect(noteRequired("  ")).toBe("Add a note before you continue.");
    expect(noteRequired("Need a clearer photo.")).toBeNull();
  });
});
