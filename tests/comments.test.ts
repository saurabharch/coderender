import { describe, expect, it } from "vitest";
import { isResourceType, maskText, nest, statusFor } from "@/lib/comments-core";
import DATA from "@/lib/moderation-data.json";

describe("comments-core policy", () => {
  it("accepts the four resource types", () => {
    expect(isResourceType("blog-post")).toBe(true);
    expect(isResourceType("kanban-task")).toBe(true);
    expect(isResourceType("kanban-todo")).toBe(true);
    expect(isResourceType("todo")).toBe(true);
    expect(isResourceType("post")).toBe(false);
  });

  it("always masks strong tokens (plain + leetspeak)", () => {
    expect(maskText("hello world, have a nice day")).toBe("hello world, have a nice day");
    // strong tokens from the dataset must never survive
    const strong = Object.entries((DATA as { tokens: Record<string, number> }).tokens)
      .filter(([, s]) => s >= 4).map(([w]) => w);
    expect(strong.length).toBeGreaterThan(0);
    for (const w of strong.slice(0, 5)) {
      expect(maskText(`say ${w} please`)).toBe("say *** please");
      expect(maskText(`say ${w.toUpperCase()} please`)).toBe("say *** please");
    }
  });

  it("maps verdicts to storage (blocks auto-hide as spam)", () => {
    expect(statusFor("block")).toBe("spam");
    expect(statusFor("block", true)).toBe("spam");
    expect(statusFor("warn")).toBe("pending");
    expect(statusFor("allow")).toBe("pending");
    expect(statusFor("allow", true)).toBe("approved");
  });

  it("nests replies chronologically", () => {
    const base = { name: "a", body: "b", status: "approved", likes: 0, editedAt: "", createdAt: "" };
    const tree = nest([
      { ...base, id: 1, parentId: null },
      { ...base, id: 3, parentId: 1 },
      { ...base, id: 2, parentId: 1 },
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].replies.map((r) => r.id)).toEqual([2, 3]);
  });
});
