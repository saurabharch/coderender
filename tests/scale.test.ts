import { describe, expect, it } from "vitest";
import { buildCsv, hasPerm, parseCsv, royaltyDue } from "@/lib/scale-core";

describe("scale-core", () => {
  it("enforces the role matrix", () => {
    expect(hasPerm("owner", "keys")).toBe(true);
    expect(hasPerm("manager", "partners")).toBe(true);
    expect(hasPerm("sales", "billing")).toBe(false);
    expect(hasPerm("cashier", "sell")).toBe(true);
    expect(hasPerm("cashier", "stock")).toBe(false);
    expect(hasPerm("staff", "reports")).toBe(false);
    expect(hasPerm("nobody", "sell")).toBe(false);
  });

  it("computes royalties", () => {
    expect(royaltyDue(1000000, 10)).toBe(100000);
    expect(royaltyDue(1000000, 0)).toBe(0);
    expect(royaltyDue(-500, 10)).toBe(0);
  });

  it("round-trips CSV with quotes", () => {
    const csv = 'name,price\n"Widget, Big",19900\nPlain,100';
    const { headers, rows } = parseCsv(csv);
    expect(headers).toEqual(["name", "price"]);
    expect(rows[0]).toEqual({ name: "Widget, Big", price: "19900" });
    expect(buildCsv(headers, rows)).toBe(csv);
    expect(parseCsv("").rows).toEqual([]);
  });
});
