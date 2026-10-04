import { describe, expect, it } from "vitest";
import { clientKey, rateLimited, slowDown } from "@/lib/rate-limit";

describe("rate-limit", () => {
  it("allows under the limit, blocks at it, recovers after the window", () => {
    const k = `t-${Date.now()}-${Math.random()}`;
    expect(rateLimited(k, 2, 50)).toBe(false);
    expect(rateLimited(k, 2, 50)).toBe(false);
    expect(rateLimited(k, 2, 50)).toBe(true);
    return new Promise<void>((done) => {
      setTimeout(() => {
        expect(rateLimited(k, 2, 50)).toBe(false);
        done();
      }, 60);
    });
  });

  it("keys combine fingerprint + ip", () => {
    const req = (ip: string) => new Request("http://x/", { headers: { "x-forwarded-for": ip } });
    expect(clientKey("fp1", req("1.1.1.1"))).toBe(clientKey("fp1", req("1.1.1.1")));
    expect(clientKey("fp1", req("1.1.1.1"))).not.toBe(clientKey("fp2", req("1.1.1.1")));
    expect(clientKey("fp1", req("1.1.1.1"))).not.toBe(clientKey("fp1", req("2.2.2.2")));
    expect(slowDown().error).toMatch(/slow down/);
  });

  it("route scopes isolate buckets (regression: one hammered endpoint must not lock others)", () => {
    const base = `t2-${Date.now()}`;
    for (let i = 0; i < 30; i++) expect(rateLimited(`${base}|license`, 30, 600_000)).toBe(i >= 30);
    expect(rateLimited(`${base}|license`, 30, 600_000)).toBe(true);
    expect(rateLimited(`${base}|auth-request`, 5, 600_000)).toBe(false);
  });
});
