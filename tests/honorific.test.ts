import { describe, expect, it } from "vitest";
import { addressAs, parseLeadName } from "@/lib/honorific";

describe("parseLeadName", () => {
  it("keeps a bare first name", () => {
    expect(parseLeadName("Saurabh")).toBe("Saurabh");
  });

  it("strips 'my name is' prefix", () => {
    expect(parseLeadName("My name is Saurabh")).toBe("Saurabh");
  });

  it("strips 'i am' and keeps full name", () => {
    expect(parseLeadName("I am Priya Sharma")).toBe("Priya Sharma");
  });

  it("drops greetings around the name", () => {
    expect(parseLeadName("hi, i'm Rahul")).toBe("Rahul");
  });

  it("rejects contact-stage noise without a name", () => {
    expect(parseLeadName("")).toBe("");
    expect(parseLeadName("ok")).toBe("");
    expect(parseLeadName("my number is")).toBe("");
    expect(parseLeadName("98317")).toBe("");
  });
});

describe("addressAs fallback", () => {
  it("falls back to friend only at render", () => {
    expect(addressAs("").label).toBe("friend");
    expect(addressAs("Saurabh").label).toContain("Saurabh");
  });
});
