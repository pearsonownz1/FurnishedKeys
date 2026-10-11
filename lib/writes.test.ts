import { describe, expect, it, vi } from "vitest";
import { SEND_FAILURE, logInsertError } from "./writes";

describe("insert failures", () => {
  it("returns the inline error and logs the database message", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(logInsertError("owner_leads", { code: "23514", message: "invalid interest" })).toBe(
      SEND_FAILURE,
    );
    expect(error).toHaveBeenCalledWith(
      "owner_leads insert failed",
      "23514",
      "invalid interest",
    );
    error.mockRestore();
  });
});