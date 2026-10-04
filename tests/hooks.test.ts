import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "@/lib/hooks-core";

describe("webhook signing", () => {
  it("signs and verifies, rejects tampering + staleness", () => {
    const secret = "whsec_test";
    const ts = Date.now();
    const sig = signPayload(secret, "k1", ts, '{"a":1}');
    expect(verifySignature(secret, sig, "k1", ts, '{"a":1}')).toBe(true);
    expect(verifySignature(secret, sig, "k1", ts, '{"a":2}')).toBe(false);
    expect(verifySignature("other", sig, "k1", ts, '{"a":1}')).toBe(false);
    expect(verifySignature(secret, sig, "k1", ts - 10 * 60 * 1000, '{"a":1}')).toBe(false);
    expect(verifySignature(secret, "garbage", "k1", ts, '{"a":1}')).toBe(false);
  });
});
