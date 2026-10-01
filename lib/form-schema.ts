// Pure form-schema helpers (no sqlite import — safe for vitest).
// Mirrors the plugin contract: 12 field types, per-field props,
// JSON Schema storage, per-type submission validation.

export const FIELD_TYPES = [
  { type: "text", label: "Text Input", schema: { type: "string" } },
  { type: "email", label: "Email", schema: { type: "string", format: "email" } },
  { type: "password", label: "Password", schema: { type: "string", fieldType: "password" } },
  { type: "number", label: "Number", schema: { type: "number" } },
  { type: "textarea", label: "Text Area", schema: { type: "string", fieldType: "textarea" } },
  { type: "select", label: "Select", schema: { type: "string", enum: ["option-1"] } },
  { type: "checkbox", label: "Checkbox", schema: { type: "boolean" } },
  { type: "switch", label: "Switch", schema: { type: "boolean", fieldType: "switch" } },
  { type: "radio", label: "Radio Group", schema: { type: "string", enum: ["option-1"], fieldType: "radio" } },
  { type: "date", label: "Date Picker", schema: { type: "string", format: "date-time" } },
  { type: "phone", label: "Phone", schema: { type: "string", fieldType: "phone" } },
  { type: "url", label: "URL", schema: { type: "string", format: "uri" } },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["type"];

export interface FormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: string[];
  default?: string | number | boolean;
}

export function sanitizeField(f: Partial<FormField>, idx: number): FormField | null {
  const name = String(f.name ?? "").toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || `field_${idx}`;
  const known = (FIELD_TYPES as readonly { type: string }[]).some((t) => t.type === f.type);
  if (!known) return null;
  const out: FormField = { name, label: String(f.label ?? name).slice(0, 80), type: String(f.type) };
  if (f.required) out.required = true;
  if (f.description) out.description = String(f.description).slice(0, 200);
  if (f.placeholder) out.placeholder = String(f.placeholder).slice(0, 120);
  if (typeof f.min === "number" && Number.isFinite(f.min)) out.min = f.min;
  if (typeof f.max === "number" && Number.isFinite(f.max)) out.max = f.max;
  if (Array.isArray(f.options)) {
    const opts = f.options.map((o) => String(o).slice(0, 80)).filter(Boolean).slice(0, 30);
    if (opts.length > 0) out.options = opts;
  }
  if (f.default !== undefined && f.default !== "") {
    if (typeof f.default === "boolean") out.default = f.default;
    else if (typeof f.default === "number" && Number.isFinite(f.default)) out.default = f.default;
    else out.default = String(f.default).slice(0, 500);
  }
  return out;
}

export function sanitizeFields(raw: unknown): FormField[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: FormField[] = [];
  raw.slice(0, 50).forEach((f, i) => {
    const s = sanitizeField((f ?? {}) as Partial<FormField>, i);
    if (!s || seen.has(s.name)) return;
    seen.add(s.name);
    out.push(s);
  });
  return out;
}

// ---- fields <-> JSON Schema (storage format) ----

export function fieldsToJsonSchema(fields: FormField[]): Record<string, unknown> {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];
  for (const f of fields) {
    const prop: Record<string, unknown> = { title: f.label };
    switch (f.type) {
      case "number": prop.type = "number"; break;
      case "checkbox":
      case "switch": prop.type = "boolean"; break;
      default: prop.type = "string"; break;
    }
    if (f.type === "email") prop.format = "email";
    if (f.type === "url") prop.format = "uri";
    if (f.type === "date") prop.format = "date-time";
    if (["password", "textarea", "phone"].includes(f.type)) prop.fieldType = f.type;
    if (f.type === "switch") prop.fieldType = "switch";
    if (f.type === "radio") prop.fieldType = "radio";
    if ((f.type === "select" || f.type === "radio") && f.options?.length) prop.enum = f.options;
    if (f.description) prop.description = f.description;
    if (f.placeholder) prop.placeholder = f.placeholder;
    if (typeof f.min === "number") {
      if (prop.type === "number") prop.minimum = f.min;
      else prop.minLength = f.min;
    }
    if (typeof f.max === "number") {
      if (prop.type === "number") prop.maximum = f.max;
      else prop.maxLength = f.max;
    }
    if (f.default !== undefined) prop.default = f.default;
    properties[f.name] = prop;
    if (f.required) required.push(f.name);
  }
  return { type: "object", properties, ...(required.length ? { required } : {}) };
}

export function jsonSchemaToFields(schema: unknown): FormField[] {
  if (!schema || typeof schema !== "object") return [];
  const props = (schema as { properties?: Record<string, Record<string, unknown>> }).properties ?? {};
  const required = new Set((schema as { required?: string[] }).required ?? []);
  return sanitizeFields(Object.entries(props).slice(0, 50).map(([name, p]) => {
    let type = "text";
    if (p.type === "number") type = "number";
    else if (p.type === "boolean") type = p.fieldType === "switch" ? "switch" : "checkbox";
    else if (p.format === "email") type = "email";
    else if (p.format === "uri") type = "url";
    else if (p.format === "date-time" || p.format === "date") type = "date";
    else if (typeof p.fieldType === "string" && ["password", "textarea", "phone", "radio"].includes(p.fieldType)) type = p.fieldType;
    else if (Array.isArray(p.enum)) type = "select";
    const f: Partial<FormField> = {
      name, label: String(p.title ?? p.label ?? name), type,
      required: required.has(name),
      description: typeof p.description === "string" ? p.description : undefined,
      placeholder: typeof p.placeholder === "string" ? p.placeholder : undefined,
      options: Array.isArray(p.enum) ? p.enum.map(String) : undefined,
      default: (p.default as FormField["default"]) ?? undefined,
    };
    if (typeof p.minimum === "number") f.min = p.minimum;
    if (typeof p.maximum === "number") f.max = p.maximum;
    if (typeof p.minLength === "number") f.min = p.minLength;
    if (typeof p.maxLength === "number") f.max = p.maxLength;
    return f;
  }));
}

// Split an allOf multi-step schema into per-step field lists.
export function stepsFromSchema(schema: unknown, fallback: FormField[]): FormField[][] {
  const allOf = (schema as { allOf?: unknown })?.allOf;
  if (!Array.isArray(allOf) || allOf.length < 2) return [fallback];
  const steps = allOf.map((s) => jsonSchemaToFields(s)).filter((s) => s.length > 0);
  return steps.length >= 2 ? steps : [fallback];
}

// ---- submission validation ----

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateValues(fields: FormField[], values: Record<string, unknown>): { ok: boolean; errors: Record<string, string>; clean: Record<string, string | number | boolean> } {
  const errors: Record<string, string> = {};
  const clean: Record<string, string | number | boolean> = {};
  for (const f of fields) {
    const raw = values[f.name];
    const empty = raw === undefined || raw === null || raw === "";
    if (empty) {
      if (f.required) errors[f.name] = "required";
      else if (f.default !== undefined) clean[f.name] = f.default;
      continue;
    }
    if (f.type === "number") {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) { errors[f.name] = "must be a number"; continue; }
      if (typeof f.min === "number" && n < f.min) { errors[f.name] = `minimum ${f.min}`; continue; }
      if (typeof f.max === "number" && n > f.max) { errors[f.name] = `maximum ${f.max}`; continue; }
      clean[f.name] = n;
      continue;
    }
    if (f.type === "checkbox" || f.type === "switch") {
      clean[f.name] = raw === true || raw === "true" || raw === "1" || raw === "on" || raw === 1;
      continue;
    }
    const s = String(raw).slice(0, 5000);
    if (f.type === "email" && !EMAIL_RE.test(s)) { errors[f.name] = "invalid email"; continue; }
    if (f.type === "url") {
      try { const u = new URL(s); if (!["http:", "https:"].includes(u.protocol)) throw new Error(); }
      catch { errors[f.name] = "invalid url"; continue; }
    }
    if (f.type === "date") {
      if (Number.isNaN(Date.parse(s))) { errors[f.name] = "invalid date"; continue; }
    }
    if (f.type === "phone" && s.replace(/\D/g, "").length < 7) { errors[f.name] = "invalid phone"; continue; }
    if ((f.type === "select" || f.type === "radio") && f.options?.length && !f.options.includes(s)) {
      errors[f.name] = "invalid option"; continue;
    }
    if (typeof f.min === "number" && s.length < f.min) { errors[f.name] = `minimum length ${f.min}`; continue; }
    if (typeof f.max === "number" && s.length > f.max) { errors[f.name] = `maximum length ${f.max}`; continue; }
    clean[f.name] = s;
  }
  return { ok: Object.keys(errors).length === 0, errors, clean };
}
