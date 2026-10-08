import { describe, expect, it } from "vitest";
import { findByCode, mergeCatalog, searchCatalog } from "@/lib/pos-catalog";

const A = { id: 1, name: "Milk 1L", price: 6000, code: "8901001" };
const B = { id: 2, name: "Bread", price: 4500, code: "8901002" };

describe("offline pos catalog", () => {
  it("merges fresh over stale and caps", () => {
    const out = mergeCatalog([A], [{ ...A, price: 6500 }, B]);
    expect(out.find((i) => i.id === 1)?.price).toBe(6500);
    expect(out).toHaveLength(2);
    const big = Array.from({ length: 600 }, (_, i) => ({ id: 100 + i, name: `P${i}`, price: 100 }));
    expect(mergeCatalog([], big)).toHaveLength(500);
  });

  it("finds by code case-insensitively", () => {
    expect(findByCode([A, B], "8901002")?.name).toBe("Bread");
    expect(findByCode([A], "nope")).toBe(null);
    expect(findByCode([A], "")).toBe(null);
  });

  it("searches names and codes, rejects short queries", () => {
    expect(searchCatalog([A, B], "milk")).toHaveLength(1);
    expect(searchCatalog([A, B], "8901")).toHaveLength(2);
    expect(searchCatalog([A, B], "x")).toEqual([]);
  });
});
