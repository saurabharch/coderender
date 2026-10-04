import { describe, expect, it } from "vitest";
import { isOptIn, isOptOut, renderTemplate, sentimentScore, triageInbound } from "@/lib/wa-crm-core";

describe("wa-crm-core", () => {
  it("scores sentiment both ways", () => {
    expect(sentimentScore("This is terrible, I hate this awful service")).toBeLessThan(-0.4);
    expect(sentimentScore("Thanks, great and amazing work!")).toBeGreaterThan(0.3);
    expect(sentimentScore("ok noted")).toBe(0);
  });

  it("triages handoff/reply/silence", () => {
    expect(triageInbound("You scammers stole my money, horrible!")).toBe("handoff");
    expect(triageInbound("What are your timings?")).toBe("reply");
    expect(triageInbound("STOP")).toBe("silent");
    expect(triageInbound("anything", { stopped: true })).toBe("silent");
    expect(triageInbound("")).toBe("silent");
  });

  it("renders template variables positionally", () => {
    expect(renderTemplate("Hi {{1}}, order {{2}} ships {{1}}", ["Asha", "42"])).toBe("Hi Asha, order 42 ships Asha");
    expect(renderTemplate("Hi {{1}}", [])).toBe("Hi {{1}}");
  });

  it("parses opt-out/in strictly", () => {
    expect(isOptOut("stop")).toBe(true);
    expect(isOptOut("STOP ")).toBe(true);
    expect(isOptOut("please stop calling")).toBe(false);
    expect(isOptIn("start")).toBe(true);
  });
});
