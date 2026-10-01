import { describe, expect, it } from "vitest";
import { addDays, barSpan, groupByDay, monthGrid, syncKey, taskDay } from "@/lib/calendar-core";

describe("calendar-core", () => {
  it("builds a Monday-first 42-cell month grid", () => {
    const g = monthGrid(2026, 10);
    expect(g).toHaveLength(42);
    expect(g.slice(0, 3)).toEqual([null, null, null]); // Oct 2026 starts Thu
    expect(g[3]).toBe("2026-10-01");
    expect(g.filter(Boolean)).toHaveLength(31);
  });

  it("picks due date first for task days", () => {
    expect(taskDay({ dueAt: "2026-10-05", doneAt: "", createdAt: "" })).toBe("2026-10-05");
    expect(taskDay({ dueAt: "", doneAt: "2026-09-01T10:00:00.000Z", createdAt: "" })).toBe("2026-09-01");
  });

  it("groups by day and spans gantt bars", () => {
    const by = groupByDay([
      { id: 1, title: "a", startAt: "", dueAt: "2026-10-05", doneAt: "", priority: "high", assigneeEmail: "" },
    ]);
    expect(Object.keys(by)).toEqual(["2026-10-05"]);
    const s = barSpan("2026-10-01", "2026-10-05", "2026-10-01", "2026-10-10");
    expect(s.left).toBe(0);
    expect(s.width).toBeGreaterThan(40);
    expect(addDays("2026-10-01", 3)).toBe("2026-10-04");
  });

  it("keys syncs per task per day", () => {
    expect(syncKey(7, "2026-10-05")).toBe("cr-task-7-2026-10-05");
  });
});
