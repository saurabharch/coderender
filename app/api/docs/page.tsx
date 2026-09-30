import type { Metadata } from "next";
import { ROUTES } from "@/lib/plugins/manifest";

export const metadata: Metadata = { title: "API Docs — CodeRender", description: "Interactive API reference. Machine-readable at /api/openapi.json." };

export default function ApiDocsPage() {
  return (
    <div className="wrap section max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Resources</p>
      <h1 className="display-1 mt-2">API Docs</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Machine-readable spec: <a className="underline" href="/api/openapi.json">/api/openapi.json</a></p>
      <div className="mt-6 grid gap-3">
        {ROUTES.map((r) => (
          <div key={r.method + r.path} className="glass rounded-2xl p-4">
            <p className="flex flex-wrap items-center gap-2 font-mono text-sm">
              <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">{r.method}</span>
              {r.path}
              <span className="rounded-full border border-black/15 px-2 py-0.5 font-sans text-xs dark:border-white/20">{r.auth}</span>
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{r.desc}</p>
            {r.body && <p className="mt-1 font-mono text-xs text-zinc-500">{r.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
