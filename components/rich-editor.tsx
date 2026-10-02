"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Inner = dynamic(() => import("./rich-editor-inner").then((m) => m.RichEditorInner), {
  ssr: false,
  loading: () => <span className="text-xs text-zinc-500">Loading editor…</span>,
});

// CKEditor 5 rich description editing (client-only, lazy). Falls back to a
// plain textarea while the editor chunk loads or if it fails.
export function RichEditor({ value, onChange, placeholder }: {
  value: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <textarea value={value} rows={4} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
    );
  }
  return (
    <Inner value={value} onChange={onChange} placeholder={placeholder} onFail={() => setFailed(true)} />
  );
}
