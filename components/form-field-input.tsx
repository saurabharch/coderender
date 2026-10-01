"use client";

import type { FormField } from "@/lib/form-schema";

export interface FieldWidgetProps {
  field: FormField;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
  error?: string;
}

// Shared input for one field type. Custom components can replace any type
// via the `fieldComponents` prop on FormRenderer.
export function FieldInput({ field, value, onChange, error }: FieldWidgetProps) {
  const cls = "min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20";
  const err = error ? <span className="text-xs text-red-600">{error}</span> : null;
  const hint = field.description ? <span className="text-xs text-zinc-500">{field.description}</span> : null;
  const str = typeof value === "boolean" ? "" : String(value ?? field.default ?? "");

  switch (field.type) {
    case "textarea":
      return (
        <span className="grid gap-1">{hint}
          <textarea name={field.name} value={str} placeholder={field.placeholder} required={field.required} rows={4}
            onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
          {err}</span>
      );
    case "select":
      return (
        <span className="grid gap-1">{hint}
          <select name={field.name} value={str} required={field.required} onChange={(e) => onChange(e.target.value)} className={cls}>
            <option value="">— choose —</option>
            {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {err}</span>
      );
    case "radio":
      return (
        <span className="grid gap-1">{hint}
          <span className="flex flex-wrap gap-3">
            {(field.options ?? []).map((o) => (
              <label key={o} className="flex min-h-[44px] items-center gap-2 text-sm">
                <input type="radio" name={field.name} value={o} checked={str === o} required={field.required && !str}
                  onChange={() => onChange(o)} className="h-5 w-5" /> {o}
              </label>
            ))}
          </span>
          {err}</span>
      );
    case "checkbox":
    case "switch":
      return (
        <span className="flex min-h-[44px] flex-wrap items-center gap-2 text-sm">{hint}
          <input name={field.name} type="checkbox" checked={value === true || value === "true" || value === "1" || value === "on"}
            onChange={(e) => onChange(e.target.checked)} className="h-5 w-5" />
          <span className="text-zinc-500">{field.type === "switch" ? "On" : field.label}</span>
          {err}</span>
      );
    case "number":
      return (
        <span className="grid gap-1">{hint}
          <input name={field.name} type="number" value={str} placeholder={field.placeholder} required={field.required}
            min={field.min} max={field.max} onChange={(e) => onChange(e.target.value)} className={cls} />
          {err}</span>
      );
    default: {
      const htmlType = field.type === "email" ? "email"
        : field.type === "password" ? "password"
        : field.type === "date" ? "datetime-local"
        : field.type === "phone" ? "tel"
        : field.type === "url" ? "url" : "text";
      return (
        <span className="grid gap-1">{hint}
          <input name={field.name} type={htmlType} value={str} placeholder={field.placeholder} required={field.required}
            minLength={field.min} maxLength={field.max} onChange={(e) => onChange(e.target.value)} className={cls} />
          {err}</span>
      );
    }
  }
}
