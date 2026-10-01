import { describe, expect, it } from "vitest";
import {
  FIELD_TYPES, sanitizeFields, fieldsToJsonSchema, jsonSchemaToFields,
  stepsFromSchema, validateValues,
} from "@/lib/form-schema";

describe("form-schema catalogue", () => {
  it("covers the 12 plugin field types", () => {
    expect(FIELD_TYPES.map((t) => t.type)).toEqual(
      expect.arrayContaining(["text", "email", "password", "number", "textarea", "select", "checkbox", "switch", "radio", "date", "phone", "url"])
    );
  });

  it("sanitizes names, drops unknown types and dupes", () => {
    const out = sanitizeFields([
      { name: "Email!", label: "Email", type: "email", required: true },
      { name: "email", label: "Dupe", type: "text" },
      { name: "x", label: "X", type: "bogus" },
    ]);
    expect(out.map((f) => f.name)).toEqual(["email"]);
  });

  it("round-trips fields through JSON Schema", () => {
    const fields = sanitizeFields([
      { name: "email", label: "Email", type: "email", required: true },
      { name: "age", label: "Age", type: "number", min: 18, max: 99 },
      { name: "topic", label: "Topic", type: "select", options: ["a", "b"] },
      { name: "ok", label: "OK", type: "switch", default: true },
    ]);
    const schema = fieldsToJsonSchema(fields) as { properties: Record<string, { format?: string; minimum?: number; enum?: string[] }>; required: string[] };
    expect(schema.properties.email.format).toBe("email");
    expect(schema.properties.age.minimum).toBe(18);
    expect(schema.properties.topic.enum).toEqual(["a", "b"]);
    expect(schema.required).toContain("email");
    const back = jsonSchemaToFields(schema);
    expect(back.map((f) => f.type)).toEqual(["email", "number", "select", "switch"]);
  });

  it("validates per type", () => {
    const fields = sanitizeFields([
      { name: "email", label: "E", type: "email", required: true },
      { name: "age", label: "A", type: "number", min: 18 },
      { name: "site", label: "S", type: "url" },
      { name: "phone", label: "P", type: "phone" },
      { name: "topic", label: "T", type: "select", options: ["a", "b"] },
    ]);
    const bad = validateValues(fields, { email: "nope", age: 5, site: "x", phone: "12", topic: "z" });
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.errors)).toEqual(expect.arrayContaining(["email", "age", "site", "phone", "topic"]));
    const good = validateValues(fields, { email: "a@b.co", age: 30, site: "https://x.in", phone: "9876543210", topic: "a" });
    expect(good.ok).toBe(true);
    expect(good.clean.age).toBe(30);
  });

  it("splits allOf multi-step schemas", () => {
    const fields = sanitizeFields([{ name: "a", label: "A", type: "text" }]);
    expect(stepsFromSchema({}, fields)).toHaveLength(1);
    const steps = stepsFromSchema({
      type: "object",
      allOf: [
        { title: "S1", properties: { name: { type: "string", title: "Name" } } },
        { title: "S2", properties: { msg: { type: "string", title: "Msg" } } },
      ],
    }, fields);
    expect(steps).toHaveLength(2);
    expect(steps[0].map((f) => f.name)).toEqual(["name"]);
  });
});
