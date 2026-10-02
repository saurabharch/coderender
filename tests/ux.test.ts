import { describe, expect, it } from "vitest";
import { dueIn, timeAgo } from "@/lib/timeago";
import { isRichHtml, sanitizeHtml } from "@/lib/sanitize";
import { expandShortcodes, PALETTE } from "@/lib/emoji";

describe("ux helpers", () => {
  it("renders relative times", () => {
    const now = new Date("2026-10-02T12:00:00Z").getTime();
    expect(timeAgo("2026-10-02T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-10-02T10:00:00Z", now)).toBe("2h ago");
    expect(timeAgo("2026-09-20T12:00:00Z", now)).toBe("12d ago");
    expect(timeAgo("bogus", now)).toBe("");
  });

  it("counts down due dates", () => {
    const now = new Date("2026-10-02T12:00:00Z").getTime();
    expect(dueIn("2026-10-04T12:00", now)).toBe("2d left");
    expect(dueIn("2026-10-01T12:00", now)).toBe("overdue 1d");
    expect(dueIn("", now)).toBe("");
  });

  it("sanitizes editor html tightly", () => {
    expect(sanitizeHtml("<p>Hi <b>there</b></p>")).toBe("<p>Hi <b>there</b></p>");
    expect(sanitizeHtml('<script>alert(1)</script><p onclick="x()">Hi</p>')).toBe("alert(1)<p>Hi</p>");
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a href="#" rel="noopener">x</a>');
    expect(sanitizeHtml('<a href="/contact">x</a>')).toBe('<a href="/contact" rel="noopener">x</a>');
    expect(isRichHtml("<p>hi</p>")).toBe(true);
    expect(isRichHtml("plain <3 text")).toBe(false);
  });

  it("expands emoji shortcodes, leaves unknown", () => {
    expect(expandShortcodes("ship it :rocket:")).toBe("ship it 🚀");
    expect(expandShortcodes("a :nope: b")).toBe("a :nope: b");
    expect(PALETTE.length).toBeGreaterThan(20);
  });
});
