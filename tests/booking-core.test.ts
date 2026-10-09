import { describe, expect, it } from "vitest";
import { findConflict, overlaps, withBuffer } from "@/lib/booking-core";

describe("booking intervals", () => {
  it("treats back-to-back as free (half-open)", () => {
    expect(overlaps(
      { start: "2026-10-10T14:00:00", end: "2026-10-11T11:00:00" },
      { start: "2026-10-11T11:00:00", end: "2026-10-12T11:00:00" },
    )).toBe(false);
    expect(overlaps(
      { start: "2026-10-10T14:00:00", end: "2026-10-11T12:00:00" },
      { start: "2026-10-11T11:00:00", end: "2026-10-12T11:00:00" },
    )).toBe(true);
  });

  it("rejects invalid ranges safely", () => {
    expect(overlaps({ start: "nope", end: "2026-10-11" }, { start: "2026-10-10", end: "2026-10-12" })).toBe(false);
    expect(overlaps({ start: "2026-10-12", end: "2026-10-10" }, { start: "2026-10-10", end: "2026-10-12" })).toBe(false);
  });

  it("finds conflicts with buffers", () => {
    const existing = [{ start: "2026-10-10T18:00:00", end: "2026-10-10T22:00:00" }];
    expect(findConflict(existing, "2026-10-10T22:00:00", "2026-10-10T23:00:00")).toBe(null);
    expect(findConflict(existing, "2026-10-10T22:00:00", "2026-10-10T23:00:00", 30)).toEqual(existing[0]);
    expect(findConflict(existing, "2026-10-10T20:00:00", "2026-10-10T21:00:00")).toEqual(existing[0]);
  });
});
