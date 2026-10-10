import { describe, expect, it } from "vitest";
import { createHmac, createHash } from "node:crypto";
import {
  easebuzzRequestHash, easebuzzVerifyResponse, paytmChecksum, paytmVerify,
  payuRequestHash, payuVerifyResponse, rzValidWebhook, rzVerifySignature,
  stripeVerifyWebhook, timingEq, wiseHost,
} from "@/lib/gateways-core";

describe("gateway hashes", () => {
  it("round-trips payu request/response hashes", () => {
    const base = {
      key: "k", txnid: "t1", amount: "100.00", productinfo: "Test",
      firstname: "Asha", email: "a@b.co", salt: "s",
    };
    const req = payuRequestHash(base);
    expect(req).toHaveLength(128);
    // Response hash has its own field order — build it independently here.
    const blanks = Array(10).fill("");
    const respSeq = ["s", "success", ...blanks, "a@b.co", "Asha", "Test", "100.00", "t1", "k"].join("|");
    const respHash = createHash("sha512").update(respSeq).digest("hex");
    expect(payuVerifyResponse({ ...base, status: "success", hash: respHash })).toBe(true);
    expect(payuVerifyResponse({ ...base, status: "success", hash: "0".repeat(128) })).toBe(false);
    expect(payuVerifyResponse({ ...base, status: "failure", hash: respHash })).toBe(false);
  });

  it("round-trips easebuzz hashes", () => {
    const base = {
      key: "k", txnid: "t1", amount: "100.00", productinfo: "Test",
      firstname: "Asha", email: "a@b.co", salt: "s", surl: "s", furl: "f",
    };
    expect(easebuzzRequestHash(base)).toHaveLength(128);
    const blanks = Array(10).fill("");
    const respSeq = ["s", "success", ...blanks, "a@b.co", "Asha", "Test", "100.00", "t1", "k"].join("|");
    const respHash = createHash("sha512").update(respSeq).digest("hex");
    expect(easebuzzVerifyResponse({ ...base, status: "success", hash: respHash })).toBe(true);
    expect(easebuzzVerifyResponse({ ...base, status: "success", hash: "1".repeat(128) })).toBe(false);
  });

  it("round-trips stripe webhook signatures", () => {
    const raw = JSON.stringify({ id: "evt_1", type: "payment_intent.succeeded" });
    const t = Math.floor(Date.now() / 1000);
    const v1 = createHmac("sha256", "whsec_test").update(`${t}.${raw}`).digest("hex");
    expect(stripeVerifyWebhook(raw, `t=${t},v1=${v1}`, "whsec_test")).toBe(t);
    expect(stripeVerifyWebhook(raw, `t=${t},v1=${"0".repeat(64)}`, "whsec_test")).toBe(null);
    expect(stripeVerifyWebhook(raw, `t=${t},v1=${v1}`, "whsec_other")).toBe(null);
    expect(stripeVerifyWebhook(raw, null, "whsec_test")).toBe(null);
    // Stale replays rejected by the 5-minute tolerance.
    const old = t - 3600;
    const oldV1 = createHmac("sha256", "whsec_test").update(`${old}.${raw}`).digest("hex");
    expect(stripeVerifyWebhook(raw, `t=${old},v1=${oldV1}`, "whsec_test")).toBe(null);
  });

  it("round-trips paytm checksums", () => {
    const params = { MID: "TESTMID01", ORDERID: "cr_9_x7", TXN_AMOUNT: "499.00", CUST_ID: "C9" };
    const sum = paytmChecksum(params, "1234567890123456");
    expect(typeof sum).toBe("string");
    expect(sum.length).toBeGreaterThan(16);
    expect(paytmVerify({ ...params, CHECKSUMHASH: sum }, "1234567890123456")).toBe(true);
    expect(paytmVerify({ ...params, TXN_AMOUNT: "500.00", CHECKSUMHASH: sum }, "1234567890123456")).toBe(false);
    expect(paytmVerify({ ...params, CHECKSUMHASH: sum }, "otherkey12345678")).toBe(false);
    expect(paytmVerify(params, "1234567890123456")).toBe(false);
    expect(() => paytmChecksum(params, "")).toThrow();
  });

  it("resolves wise hosts per mode", () => {
    expect(wiseHost("test")).toContain("sandbox");
    expect(wiseHost("live")).toBe("https://api.wise.com");
  });

  it("rejects razorpay signatures without keys", () => {
    // No vault keys in test env → must refuse, never crash.
    expect(rzVerifySignature("o", "p", "s", "")).toBe(false);
    expect(rzVerifySignature("o", "p", "s", "sec")).toBe(false);
    const good2 = createHmac("sha256", "sec").update("o|p").digest("hex");
    expect(rzVerifySignature("o", "p", good2, "sec")).toBe(true);
    expect(rzValidWebhook("{}", null, "")).toBe(false);
    expect(rzValidWebhook("{}", "x", "")).toBe(false);
    const good = createHmac("sha256", "sec").update("raw").digest("hex");
    expect(rzValidWebhook("raw", `sha256=${good}`, "sec")).toBe(true);
    expect(rzValidWebhook("tampered", `sha256=${good}`, "sec")).toBe(false);
    expect(timingEq(Buffer.from("ab"), Buffer.from("ab"))).toBe(true);
    expect(timingEq(Buffer.from("ab"), Buffer.from("ac"))).toBe(false);
    expect(createHash("sha512").update("x").digest("hex")).toHaveLength(128);
  });
});
