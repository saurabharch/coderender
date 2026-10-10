import { describe, expect, it } from "vitest";
import { checkText } from "@/lib/proofread-core";

describe("proofread-core", () => {
  it("flags doubled words and spaces", () => {
    const issues = checkText("This is is a test  with doubles.");
    expect(issues.some((x) => x.kind === "double-word")).toBe(true);
    expect(issues.some((x) => x.kind === "double-space")).toBe(true);
  });

  it("flags repeated sentences and lowercase starts", () => {
    const issues = checkText("Growth matters a lot for shops. growth matters a lot for shops.");
    expect(issues.some((x) => x.kind === "repeat-sentence")).toBe(true);
    expect(issues.some((x) => x.kind === "casing")).toBe(true);
  });

  it("strips html and stays quiet on clean copy", () => {
    expect(checkText("<p>Clean copy here. All good today.</p>")).toEqual([]);
    expect(checkText("")).toEqual([]);
  });
});
