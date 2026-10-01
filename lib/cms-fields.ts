import { z } from "zod";
import { schemaFor, FIELD_UI } from "./cms-schemas";

export interface FieldDef {
  name: string;
  kind: "text" | "textarea" | "number" | "switch" | "select" | "radio" | "file" | "relation";
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: string[];
  relation?: { targetType: string; displayField: string };
  value?: unknown;
}

function zodKind(v: z.ZodTypeAny): { kind: FieldDef["kind"]; required: boolean; options?: string[] } {
  let optional = false;
  let inner: z.ZodTypeAny = v;
  for (;;) {
    if (inner instanceof z.ZodOptional) {
      optional = true;
      inner = inner.unwrap();
      continue;
    }
    if (inner instanceof z.ZodDefault) {
      inner = (inner as z.ZodDefault<z.ZodTypeAny>)._def.innerType as z.ZodTypeAny;
      continue;
    }
    break;
  }
  const t = (inner as z.ZodTypeAny)._def.typeName;
  if (t === "ZodBoolean") return { kind: "switch", required: !optional };
  if (t === "ZodNumber") return { kind: "number", required: !optional };
  if (t === "ZodEnum") return { kind: "select", required: !optional, options: (inner as z.ZodEnum<[string, ...string[]]>).options };
  return { kind: "text", required: !optional };
}

export function fieldsFor(type: string, values: Record<string, unknown> = {}): FieldDef[] | null {
  const schema = schemaFor(type);
  if (!schema || !(schema instanceof z.ZodObject)) return null;
  return Object.entries(schema.shape).map(([name, v]) => {
    const base = zodKind(v as z.ZodTypeAny);
    const ui = FIELD_UI[`${type}.${name}`] ?? {};
    return {
      name,
      kind: ui.fieldType ?? base.kind,
      required: base.required,
      description: ui.description,
      placeholder: ui.placeholder,
      options: base.options,
      relation: ui.relation,
      value: values[name],
    };
  });
}

export function shapeOf(schema: z.ZodTypeAny): Record<string, string> {
  if (schema instanceof z.ZodObject) {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(schema.shape)) {
      const t = (v as z.ZodTypeAny)._def.typeName;
      out[k] = t.replace("Zod", "").toLowerCase();
    }
    return out;
  }
  return {};
}

export function describeType(slug: string) {
  const schema = schemaFor(slug);
  if (!schema) return null;
  return { slug, shape: shapeOf(schema) };
}

// Coerce a server-action FormData into schema-shaped input.
export function coerceForm(type: string, form: FormData): Record<string, unknown> {
  const fields = fieldsFor(type) ?? [];
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f.kind === "switch") {
      out[f.name] = form.get(f.name) === "1" || form.get(f.name) === "on";
      continue;
    }
    if (f.kind === "relation") {
      const raw = form.get(`${f.name}.id`);
      const s = String(raw ?? "").trim();
      if (s) out[f.name] = { id: s };
      continue;
    }
    if (f.kind === "number") {
      const raw = String(form.get(f.name) ?? "").trim();
      if (raw) out[f.name] = Number(raw);
      continue;
    }
    const raw = form.get(f.name);
    if (typeof raw === "string") out[f.name] = raw;
    else if (raw != null) out[f.name] = String(raw);
  }
  return out;
}
