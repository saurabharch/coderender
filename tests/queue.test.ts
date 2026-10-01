import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, backoffMs, isJobKind } from "@/lib/queue-core";

describe("queue-core", () => {
  it("backs off exponentially", () => {
    expect(backoffMs(0)).toBe(30_000);
    expect(backoffMs(2)).toBe(480_000);
    expect(backoffMs(99)).toBe(7_200_000);
    expect(MAX_ATTEMPTS).toBe(5);
  });

  it("accepts known kinds only", () => {
    expect(isJobKind("gcal.push")).toBe(true);
    expect(isJobKind("agent.call")).toBe(true);
    expect(isJobKind("rm -rf")).toBe(false);
  });
});
