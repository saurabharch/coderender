import { describe, expect, it } from "vitest";
import { cleanBody, isHtmlBody, plainExcerpt, readMinutes } from "@/lib/body-html";

describe("body-html", () => {
  it("detects html vs plain text", () => {
    expect(isHtmlBody("<p>hi</p>")).toBe(true);
    expect(isHtmlBody("  <h1>x")).toBe(true);
    expect(isHtmlBody("plain comunsense text")).toBe(false);
  });

  it("strips scripts and event handlers, keeps safe markup", () => {
    const out = cleanBody('<p onclick="evil()">hi<script>alert(1)</script><img src="https://x.test/a.png" onerror="x()"></p>');
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("onerror");
    expect(out).toContain("<img");
    expect(out).toContain("hi");
  });

  it("builds excerpts and read times", () => {
    expect(plainExcerpt("<p>Hello <b>world</b></p>", 5)).toBe("Hell…");
    expect(readMinutes("word ".repeat(400))).toBe(2);
    expect(readMinutes("")).toBe(1);
  });
});
