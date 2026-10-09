import { describe, expect, it } from "vitest";
import { clientKey, isLocalHost, rateLimited, slowDown } from "@/lib/rate-limit";

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

describe("isLocalHost", () => {
  it("accepts loopback and private LAN, rejects public", () => {
    expect(isLocalHost("localhost:3100")).toBe(true);
    expect(isLocalHost("127.0.0.1")).toBe(true);
    expect(isLocalHost("192.168.1.5:3100")).toBe(true);
    expect(isLocalHost("10.0.0.2")).toBe(true);
    expect(isLocalHost("172.20.0.3")).toBe(true);
    expect(isLocalHost("172.32.0.3")).toBe(false);
    expect(isLocalHost("coderender.optyx.shop")).toBe(false);
    expect(isLocalHost(null)).toBe(false);
  });
});
