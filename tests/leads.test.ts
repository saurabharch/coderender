import { describe, expect, it } from "vitest";
import { leadSchema } from "@/lib/lead-schema";

describe("leadSchema", () => {
  it("accepts a valid lead", () => {
    const r = leadSchema.safeParse({ name: "Asha", phone: "9876543210", businessType: "salon-owners", source: "contact" });
    expect(r.success).toBe(true);
  });
  it("rejects short name/phone", () => {
    const r = leadSchema.safeParse({ name: "A", phone: "123", businessType: "x", source: "y" });
    expect(r.success).toBe(false);
  });
});
