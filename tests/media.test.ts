import { describe, expect, it } from "vitest";
import { isAllowedMime, MAX_BYTES, publicUrl } from "@/lib/media-core";

describe("media", () => {
  it("allows images + pdf under the cap", () => {
    expect(isAllowedMime("image/png")).toBe(true);
    expect(isAllowedMime("image/svg+xml")).toBe(true);
    expect(isAllowedMime("application/pdf")).toBe(true);
    expect(isAllowedMime("video/mp4")).toBe(false);
    expect(isAllowedMime("text/html")).toBe(false);
    expect(MAX_BYTES).toBe(2 * 1024 * 1024);
  });

  it("prefers registered urls, falls back to uploads", () => {
    expect(publicUrl({ filename: "a.png", url: "" })).toBe("/uploads/a.png");
    expect(publicUrl({ filename: "a.png", url: "https://x.in/a.png" })).toBe("https://x.in/a.png");
    expect(publicUrl({ filename: "", url: "" })).toBe("");
  });
});
