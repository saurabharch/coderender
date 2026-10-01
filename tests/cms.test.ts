import { describe, expect, it } from "vitest";
import { schemaFor, CONTENT_TYPES } from "@/lib/cms-schemas";
import { describeType, fieldsFor, coerceForm } from "@/lib/cms-fields";

describe("cms schemas", () => {
  it("exposes the typed catalogue", () => {
    expect(CONTENT_TYPES.map((t) => t.slug)).toEqual(
      expect.arrayContaining(["announcement", "page", "faq", "highlight", "category"])
    );
    for (const t of CONTENT_TYPES) expect(schemaFor(t.slug)).toBeTruthy();
    expect(schemaFor("nope")).toBeNull();
  });

  it("validates each type", () => {
    expect(schemaFor("announcement")!.safeParse({ text: "hi" }).success).toBe(true);
    expect(schemaFor("announcement")!.safeParse({ text: "" }).success).toBe(false);
    expect(schemaFor("faq")!.safeParse({ question: "q", answer: "a", topic: "bogus" }).success).toBe(false);
  });

  it("describes shapes + field kinds (switch/select/relation/file)", () => {
    expect(describeType("faq")?.shape.question).toBeTruthy();
    const kinds = Object.fromEntries(fieldsFor("testimonial")!.map((f) => [f.name, f.kind]));
    expect(kinds.categoryId).toBe("relation");
    expect(fieldsFor("highlight")!.find((f) => f.name === "image")?.kind).toBe("file");
    expect(fieldsFor("faq")!.find((f) => f.name === "topic")?.kind).toBe("select");
    expect(fieldsFor("page")!.find((f) => f.name === "published")?.kind).toBe("switch");
  });

  it("coerces FormData (switch on, relation id, text)", () => {
    const form = new FormData();
    form.set("question", "Q?");
    form.set("answer", "A.");
    form.set("topic", "pricing");
    form.set("published", "1");
    const out = coerceForm("faq", form);
    expect(out).toMatchObject({ question: "Q?", topic: "pricing", published: true });

    const rel = new FormData();
    rel.set("name", "N");
    rel.set("quote", "Great!");
    rel.set("categoryId.id", "7");
    expect(coerceForm("testimonial", rel)).toMatchObject({ name: "N", categoryId: { id: "7" } });
  });
});
