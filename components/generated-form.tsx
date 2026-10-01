"use client";

import { useEffect, useState } from "react";

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

export function GeneratedForm({ fields, action, submitLabel }: {
  fields: FieldDef[];
  action: (form: FormData) => void;
  submitLabel: string;
}) {
  const [relationOpts, setRelationOpts] = useState<Record<string, { id: number; label: string }[]>>({});

  useEffect(() => {
    for (const f of fields) {
      if (f.kind === "relation" && f.relation && !relationOpts[f.name]) {
        fetch(`/api/cms/${f.relation.targetType}?limit=100`).then((r) => r.json()).then((d) => {
          const items = (d.items ?? []).map((it: { id: number; data: Record<string, unknown> }) => ({
            id: it.id,
            label: String(it.data[f.relation!.displayField] ?? `#${it.id}`),
          }));
          setRelationOpts((o) => ({ ...o, [f.name]: items }));
        }).catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/media/upload", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!data.url) throw new Error("upload failed");
    return data.url;
  }

  return (
    <div className="grid gap-3">
      {fields.map((f) => (
        <label key={f.name} className="grid gap-1 text-sm">{f.name}
          {f.description && <span className="text-xs text-zinc-500">{f.description}</span>}
          {f.kind === "textarea" && (
            <textarea name={f.name} defaultValue={String(f.value ?? "")} placeholder={f.placeholder} rows={4} required={f.required}
              className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
          )}
          {f.kind === "number" && (
            <input name={f.name} type="number" defaultValue={String(f.value ?? "")} required={f.required}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          )}
          {(f.kind === "switch") && (
            <span className="flex min-h-[44px] items-center gap-2">
              <input name={f.name} type="checkbox" value="1" defaultChecked={!!f.value} className="h-5 w-5" />
              <span className="text-zinc-500">On</span>
            </span>
          )}
          {(f.kind === "select" || f.kind === "radio") && (
            <span className={f.kind === "radio" ? "flex flex-wrap gap-3" : ""}>
              {f.kind === "select" ? (
                <select name={f.name} defaultValue={String(f.value ?? "")} required={f.required}
                  className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
                  {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                (f.options ?? []).map((o) => (
                  <label key={o} className="flex min-h-[44px] items-center gap-2">
                    <input type="radio" name={f.name} value={o} defaultChecked={String(f.value) === o} className="h-5 w-5" /> {o}
                  </label>
                ))
              )}
            </span>
          )}
          {f.kind === "file" && (
            <span className="grid gap-1">
              <input type="file" accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const hidden = document.getElementById(`file-${f.name}`) as HTMLInputElement | null;
                  if (hidden) hidden.value = "uploading…";
                  try {
                    const url = await upload(file);
                    if (hidden) hidden.value = url;
                  } catch {
                    if (hidden) hidden.value = "";
                  }
                }} />
              <input id={`file-${f.name}`} name={f.name} defaultValue={String(f.value ?? "")} placeholder={f.placeholder || "…or paste URL"}
                className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
            </span>
          )}
          {f.kind === "relation" && (
            <select name={`${f.name}.id`} defaultValue={String((f.value as { id?: number } | undefined)?.id ?? "")}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
              <option value="">— none —</option>
              {(relationOpts[f.name] ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          )}
          {f.kind === "text" && (
            <input name={f.name} defaultValue={String(f.value ?? "")} placeholder={f.placeholder} required={f.required}
              className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          )}
        </label>
      ))}
      <button formAction={action} className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">{submitLabel}</button>
    </div>
  );
}
