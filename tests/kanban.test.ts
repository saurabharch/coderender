import { describe, expect, it } from "vitest";
import {
  PRIORITIES, isPriority, priorityBadge, normalizeOrder, boardAnalytics,
} from "@/lib/kanban-core";

describe("kanban-core", () => {
  it("has four priority levels with badges", () => {
    expect(PRIORITIES.map((p) => p.id)).toEqual(["low", "medium", "high", "urgent"]);
    expect(isPriority("urgent")).toBe(true);
    expect(isPriority("bogus")).toBe(false);
    expect(priorityBadge("high")).toContain("orange");
    expect(priorityBadge("bogus")).toBe(priorityBadge("medium"));
  });

  it("normalizes order gaplessly", () => {
    expect(normalizeOrder([7, 3, 9])).toEqual({ 7: 0, 3: 1, 9: 2 });
    expect(normalizeOrder([])).toEqual({});
  });

  it("computes board analytics", () => {
    const now = new Date("2026-10-01T12:00:00Z").getTime();
    const s = boardAnalytics({
      columns: [{ id: 1, name: "To Do" }, { id: 2, name: "Done" }],
      tasks: [
        { columnId: 1, priority: "urgent", createdAt: "2026-09-28T12:00:00Z", doneAt: "", archived: 0 },
        { columnId: 2, priority: "low", createdAt: "2026-09-20T12:00:00Z", doneAt: "2026-09-25T12:00:00Z", archived: 0 },
        { columnId: 1, priority: "medium", createdAt: "2026-09-01T12:00:00Z", doneAt: "", archived: 1 },
      ],
      moves: [{ day: "2026-09-30", n: 3 }],
    }, now);
    expect(s.total).toBe(2);
    expect(s.perColumn).toEqual([{ name: "To Do", n: 1 }, { name: "Done", n: 1 }]);
    expect(s.done7d).toBe(1);
    expect(s.done30d).toBe(1);
    expect(s.avgCycleDays).toBe(5);
    expect(s.throughput).toEqual([{ day: "2026-09-30", n: 3 }]);
  });
});
