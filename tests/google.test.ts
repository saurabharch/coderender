import { describe, expect, it } from "vitest";
import { SCOPE_SET, docsText, driveParams, driveQuery, scopeString } from "@/lib/google-core";

describe("google-core", () => {
  it("requests calendar + drive + docs scopes", () => {
    const s = scopeString();
    expect(s).toContain("calendar.events");
    expect(s).toContain("drive.readonly");
    expect(s).toContain("/documents");
    expect(SCOPE_SET).toBeGreaterThanOrEqual(2);
  });

  it("extracts doc text, skipping non-text elements", () => {
    const doc = {
      body: {
        content: [
          { paragraph: { elements: [{ textRun: { content: "Hello " } }, { textRun: { content: "world\n" } }] } },
          { sectionBreak: {} },
          { paragraph: { elements: [{ textRun: {} }, {}] } },
        ],
      },
    };
    expect(docsText(doc as never)).toBe("Hello world\n");
    expect(docsText({})).toBe("");
  });

  it("builds safe drive queries", () => {
    expect(driveQuery("invoice")).toContain("invoice");
    expect(driveQuery('a"b\\c')).not.toMatch(/["\\]/);
    expect(driveQuery("")).toBe("trashed = false");
    const p = driveParams("x", 999);
    expect(p.get("pageSize")).toBe("50");
    expect(p.get("fields")).toContain("webViewLink");
  });
});
