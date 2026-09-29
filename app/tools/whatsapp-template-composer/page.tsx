"use client";

import { useState } from "react";

const STARTERS = [
  "Hi {{name}}! Thanks for visiting {{business}}. Your {{service}} slot is confirmed for {{day}}.",
  "Hi {{name}}, your appointment reminder: {{service}} tomorrow at {{time}}. Reply YES to confirm.",
  "Namaste {{name}}! Festive offer at {{business}}: {{offer}}. Valid till {{day}}.",
];

export default function TemplateComposerPage() {
  const [tpl, setTpl] = useState(STARTERS[0]);
  const [vars, setVars] = useState("name=Asha\nbusiness=Glow Salon\nservice=bridal trial\nday=Saturday");
  const [copied, setCopied] = useState(false);

  const map = Object.fromEntries(
    vars.split("\n").map((l) => { const [k, ...r] = l.split("="); return [k.trim(), r.join("=").trim()]; }).filter(([k]) => k)
  );
  const out = tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? `{{${k}}}`);

  async function copy() {
    await navigator.clipboard.writeText(out);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Free tool</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">WhatsApp Template Composer</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">Draft broadcast templates with variables, preview the filled message, copy it. All in your browser.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {STARTERS.map((s, i) => (
          <button key={i} onClick={() => setTpl(s)} className="min-h-[44px] rounded-full border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Starter {i + 1}</button>
        ))}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm">Template (use {"{{name}}"} style variables)
          <textarea value={tpl} onChange={(e) => setTpl(e.target.value)} rows={6} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
        </label>
        <label className="grid gap-1 text-sm">Values (one per line: key=value)
          <textarea value={vars} onChange={(e) => setVars(e.target.value)} rows={6} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
        </label>
      </div>
      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-black">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Preview</p>
        <p className="mt-2 whitespace-pre-wrap">{out}</p>
      </div>
      <button onClick={copy} className="mt-3 min-h-[44px] rounded-xl bg-brand px-6 font-semibold text-white">{copied ? "Copied!" : "Copy message"}</button>
    </div>
  );
}
