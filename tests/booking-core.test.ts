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

describe("series expansion", () => {
  it("expands weekly days and caps", async () => {
    const { expandSeries } = await import("@/lib/booking-core");
    const out = expandSeries({
      startDate: "2026-10-05", startTime: "18:00", endTime: "20:00",
      repeat: "weekly", weekdays: [1, 3], until: "2026-10-31",
    });
    // Mondays + Wednesdays in range: 5,7,12,14,19,21,26,28 = 8
    expect(out).toHaveLength(8);
    expect(out[0]).toEqual({ startAt: "2026-10-05T18:00:00", endAt: "2026-10-05T20:00:00" });
    expect(expandSeries({
      startDate: "2026-10-05", startTime: "18:00", endTime: "20:00",
      repeat: "weekly", weekdays: [1], until: "2027-12-31",
    }, 3)).toHaveLength(3);
  });

  it("rolls overnight spans past midnight", async () => {
    const { expandSeries } = await import("@/lib/booking-core");
    const out = expandSeries({
      startDate: "2026-10-10", startTime: "22:00", endTime: "02:00",
      repeat: "weekly", weekdays: [6], until: "2026-10-10",
    });
    expect(out).toEqual([{ startAt: "2026-10-10T22:00:00", endAt: "2026-10-11T02:00:00" }]);
  });

  it("rejects bad rules with []", async () => {
    const { expandSeries } = await import("@/lib/booking-core");
    expect(expandSeries({ startDate: "x", startTime: "18:00", endTime: "20:00", repeat: "weekly", until: "2026-10-31" })).toEqual([]);
    expect(expandSeries({ startDate: "2026-10-05", startTime: "25:00", endTime: "20:00", repeat: "weekly", until: "2026-10-31" })).toEqual([]);
  });
});
