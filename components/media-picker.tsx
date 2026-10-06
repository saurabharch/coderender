"use client";

import { useEffect, useState } from "react";

interface Asset {
  id: number; mime: string; size: number; folder: string; alt: string; url: string; filename: string;
}

function assetUrl(a: Asset): string {
  return a.url || (a.filename ? `/uploads/${a.filename}` : "");
}

async function uploadFile(file: File, folder: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  if (folder) form.append("folder", folder);
  const res = await fetch("/api/media/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!data.url) throw new Error(data?.error || "upload failed");
  return data.url as string;
}

// Compact browse/upload/URL flow for embedding inside any form.
export function MediaPicker({ onSelect, folder }: { onSelect: (url: string) => void; folder?: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Asset[]>([]);
  const [q, setQ] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await fetch(`/api/media/assets?limit=24${q ? `&q=${encodeURIComponent(q)}` : ""}${folder ? `&folder=${encodeURIComponent(folder)}` : ""}`)
      .then((r) => r.json()).catch(() => null);
    if (d?.items) setItems(d.items);
  }

  useEffect(() => { if (open) void load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span>
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">
        {open ? "Close library" : "Browse library"}
      </button>
      {open && (
        <span className="mt-2 grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <span className="flex gap-1">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void load(); }}
              placeholder="Search…" maxLength={200}
              className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <button type="button" onClick={() => void load()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Go</button>
          </span>
          <span className="grid grid-cols-3 gap-1">
            {items.map((a) => {
              const src = assetUrl(a);
              if (!src) return null;
              return (
                <button key={a.id} type="button" onClick={() => { onSelect(src); setOpen(false); }} title={a.alt || a.filename}
                  className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={a.alt || a.filename} className="aspect-square w-full object-cover" loading="lazy" />
                </button>
              );
            })}
          </span>
          {items.length === 0 && <span className="text-xs text-zinc-500">Nothing here — upload or paste a URL.</span>}
          <label className="grid gap-1 text-xs">Upload new
            <input type="file" accept="image/*" disabled={busy} onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                const src = await uploadFile(f, folder ?? "");
                onSelect(src);
                setOpen(false);
              } catch { /* keep open on failure */ }
              setBusy(false);
              e.target.value = "";
            }} />
          </label>
          <span className="flex gap-1">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste image URL"
              className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <button type="button" disabled={!url.trim()} onClick={async () => {
              const res = await fetch("/api/media/assets", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim(), folder: folder ?? "" }),
              });
              if (res.ok) {
                onSelect(url.trim());
                setUrl("");
                setOpen(false);
              }
            }} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm disabled:opacity-50 dark:border-white/20">Use</button>
          </span>
        </span>
      )}
    </span>
  );
}

// Form-ready cover field: picker UI + hidden input carrying the URL.
export function CoverField({ name, initial }: { name: string; initial?: string }) {
  const [value, setValue] = useState(initial ?? "");
  return (
    <span className="grid gap-1 text-sm">Cover image
      <input type="hidden" name={name} value={value} />
      <ImageInputField value={value} onChange={setValue} folder="blog" />
    </span>
  );
}
export function ImageInputField({ value, onChange, folder }: {
  value: string; onChange: (url: string) => void; folder?: string;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <span className="grid gap-2">
      {text ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={text} alt="preview" className="h-24 w-auto rounded-xl border border-black/10 object-cover dark:border-white/10" />
      ) : null}
      <span className="flex flex-wrap gap-1">
        <input value={text} onChange={(e) => { setText(e.target.value); onChange(e.target.value); }}
          placeholder="/uploads/… or https://…" maxLength={500}
          className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        {text ? (
          <button type="button" onClick={() => { setText(""); onChange(""); }}
            className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Remove</button>
        ) : null}
      </span>
      <MediaPicker folder={folder} onSelect={(u) => { setText(u); onChange(u); }} />
    </span>
  );
}
