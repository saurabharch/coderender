"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FIELD_TYPES, fieldsToJsonSchema, sanitizeFields, type FormField } from "@/lib/form-schema";
import { FieldInput } from "./form-field-input";

export interface BuilderInitial {
  id?: number;
  title?: string;
  slug?: string;
  fields?: FormField[];
  successMessage?: string;
  redirectUrl?: string;
  status?: "active" | "inactive" | "archived";
}

function blank(t: string, n: number): FormField {
  const base: FormField = { name: `field_${n}`, label: `Field ${n}`, type: t };
  if (t === "select" || t === "radio") base.options = ["option-1", "option-2"];
  return base;
}

export function FormBuilder({ initial }: { initial?: BuilderInitial }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [fields, setFields] = useState<FormField[]>(initial?.fields ?? [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "phone", label: "Phone", type: "phone", required: true },
  ]);
  const [sel, setSel] = useState(0);
  const [successMessage, setSuccessMessage] = useState(initial?.successMessage ?? "");
  const [redirectUrl, setRedirectUrl] = useState(initial?.redirectUrl ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [tab, setTab] = useState<"build" | "preview" | "json">("build");
  const [importJson, setImportJson] = useState("");
  const [saved, setSaved] = useState<{ id: number } | null>(initial?.id ? { id: initial.id } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const schema = useMemo(() => fieldsToJsonSchema(fields), [fields]);
  const current = fields[Math.min(sel, Math.max(fields.length - 1, 0))];

  function patch(i: number, p: Partial<FormField>) {
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...p } : f)));
  }

  async function save() {
    setBusy(true);
    setError("");
    const body = {
      title: title.trim(), slug: slug.trim(), fields,
      schema, successMessage: successMessage.trim(), redirectUrl: redirectUrl.trim(), status,
    };
    try {
      const res = await fetch(saved?.id ? `/api/forms/${saved.id}` : "/api/forms", {
        method: saved?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSaved({ id: saved?.id ?? data.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="grid gap-2 md:grid-cols-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Form title"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
          placeholder="slug" disabled={!!saved?.id}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20 disabled:opacity-60" />
        <input value={successMessage} onChange={(e) => setSuccessMessage(e.target.value)} placeholder="Success message (optional)"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} placeholder="Redirect URL after submit (optional, e.g. /thank-you)"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(["build", "preview", "json"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${tab === t ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>
            {t === "build" ? "Build" : t === "preview" ? "Preview" : "JSON Schema"}
          </button>
        ))}
        <label className="ml-auto flex min-h-[44px] items-center gap-2 text-sm">Status
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      {tab === "build" && (
        <div className="mt-3 grid gap-4 lg:grid-cols-[220px_1fr_260px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Palette</p>
            <div className="mt-1 grid gap-1">
              {FIELD_TYPES.map((t) => (
                <button key={t.type} onClick={() => {
                  setFields((fs) => [...fs, blank(t.type, fs.length + 1)]);
                  setSel(fields.length);
                }} className="min-h-[44px] rounded-xl border border-black/10 px-3 text-left text-sm hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                  + {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Canvas ({fields.length})</p>
            <ul className="mt-1 space-y-1">
              {fields.map((f, i) => (
                <li key={`${f.name}-${i}`} className={`flex items-center gap-1 rounded-xl border p-2 text-sm ${i === sel ? "border-brand" : "border-black/10 dark:border-white/10"}`}>
                  <button onClick={() => setSel(i)} className="min-h-[44px] flex-1 truncate text-left">
                    <b>{f.label}</b> <span className="text-xs text-zinc-500">{f.type}{f.required ? " · required" : ""}</span>
                  </button>
                  <button aria-label="Move up" onClick={() => {
                    if (i === 0) return;
                    setFields((fs) => { const c = [...fs]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; });
                    setSel(i - 1);
                  }} className="p-2">↑</button>
                  <button aria-label="Move down" onClick={() => {
                    if (i === fields.length - 1) return;
                    setFields((fs) => { const c = [...fs]; [c[i + 1], c[i]] = [c[i], c[i + 1]]; return c; });
                    setSel(i + 1);
                  }} className="p-2">↓</button>
                  <button aria-label="Remove field" onClick={() => {
                    setFields((fs) => fs.filter((_, j) => j !== i));
                    setSel(0);
                  }} className="p-2">✕</button>
                </li>
              ))}
              {fields.length === 0 && <li className="text-sm text-zinc-500">Add fields from the palette.</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Field properties</p>
            {current ? (
              <div className="mt-1 grid gap-2 rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10">
                <label className="grid gap-1">Label
                  <input value={current.label} onChange={(e) => patch(sel, { label: e.target.value })}
                    className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
                <label className="grid gap-1">Field name
                  <input value={current.name} onChange={(e) => patch(sel, { name: e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_") })}
                    className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 font-mono text-xs dark:border-white/20" /></label>
                <label className="grid gap-1">Description
                  <input value={current.description ?? ""} onChange={(e) => patch(sel, { description: e.target.value })}
                    className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
                <label className="grid gap-1">Placeholder
                  <input value={current.placeholder ?? ""} onChange={(e) => patch(sel, { placeholder: e.target.value })}
                    className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
                <label className="flex min-h-[44px] items-center gap-2">
                  <input type="checkbox" checked={!!current.required} onChange={(e) => patch(sel, { required: e.target.checked })} className="h-5 w-5" /> Required</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">Min
                    <input type="number" value={current.min ?? ""} onChange={(e) => patch(sel, { min: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
                  <label className="grid gap-1">Max
                    <input type="number" value={current.max ?? ""} onChange={(e) => patch(sel, { max: e.target.value === "" ? undefined : Number(e.target.value) })}
                      className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
                </div>
                {(current.type === "select" || current.type === "radio") && (
                  <label className="grid gap-1">Options (one per line)
                    <textarea value={(current.options ?? []).join("\n")} rows={3}
                      onChange={(e) => patch(sel, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                      className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" /></label>
                )}
                <label className="grid gap-1">Default value
                  <input value={String(current.default ?? "")} onChange={(e) => patch(sel, { default: e.target.value })}
                    className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
              </div>
            ) : <p className="mt-1 text-sm text-zinc-500">Select a field.</p>}
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="mt-3 max-w-xl rounded-2xl border border-black/10 p-4 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live preview</p>
          <div className="mt-2 grid gap-3">
            {fields.map((f, i) => (
              <span key={`${f.name}-${i}`} className="grid gap-1 text-sm">{f.type === "checkbox" ? null : f.label}
                <FieldInput field={f} value={f.default} onChange={() => {}} />
              </span>
            ))}
            {fields.length === 0 && <p className="text-sm text-zinc-500">Nothing to preview.</p>}
          </div>
        </div>
      )}

      {tab === "json" && (
        <div className="mt-3 grid gap-3">
          <pre className="overflow-auto rounded-2xl border border-black/10 p-3 font-mono text-xs dark:border-white/10">{JSON.stringify(schema, null, 2)}</pre>
          <label className="grid gap-1 text-sm">Import fields JSON (replaces canvas)
            <textarea value={importJson} onChange={(e) => setImportJson(e.target.value)} rows={3}
              placeholder='[{"name":"email","label":"Email","type":"email","required":true}]'
              className="rounded-xl border border-black/15 bg-transparent px-3 py-2 font-mono text-xs dark:border-white/20" /></label>
          <button onClick={() => {
            try {
              const arr = sanitizeFields(JSON.parse(importJson));
              if (arr.length) { setFields(arr); setSel(0); setImportJson(""); }
              else setError("No valid fields found.");
            } catch { setError("Invalid JSON."); }
          }} className="min-h-[44px] w-fit rounded-xl border border-black/15 px-5 text-sm font-semibold dark:border-white/20">Apply import</button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={busy || !title.trim() || !slug.trim() || fields.length === 0}
          className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60">
          {saved?.id ? "Save changes" : "Create form"}</button>
        {saved?.id && (
          <>
            <Link href={`/f/${slug}`} className="min-h-[44px] rounded-xl border border-black/15 px-5 py-2.5 text-sm font-semibold dark:border-white/20">View public form</Link>
            <Link href={`/admin/forms/${saved.id}/submissions`} className="min-h-[44px] rounded-xl border border-black/15 px-5 py-2.5 text-sm font-semibold dark:border-white/20">Submissions</Link>
          </>
        )}
      </div>
    </div>
  );
}
