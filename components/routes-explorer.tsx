"use client";

import { useState } from "react";
import { Accordion } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { NoSsr } from "@/components/no-ssr";
import type { RouteDoc } from "@/lib/plugins/manifest";

export function RoutesExplorer({ routes }: { routes: RouteDoc[] }) {
  const [q, setQ] = useState("");
  const rows = routes.filter((r) =>
    !q || `${r.method} ${r.path} ${r.desc}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter routes…" maxLength={80}
        className="mt-4 min-h-[44px] w-full max-w-xl rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <NoSsr>
      <Accordion variant="separated" className="mt-3">
        {rows.slice(0, 120).map((r) => (
          <Accordion.Item key={r.method + r.path} value={r.method + r.path}>
            <Accordion.Control>
              <span className="font-mono text-xs"><b>{r.method}</b> {r.path} <span className="text-zinc-500">· {r.auth}</span></span>
            </Accordion.Control>
            <Accordion.Panel>
              <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-300">{r.desc}</p>
              <CodeHighlight
                language="bash"
                code={`curl -s $BASE${r.path.split("?")[0]}${r.method === "GET" ? "" : ` -X ${r.method} -H 'Content-Type: application/json' -d '${r.body ?? "{}"}'`}`}
              />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      {rows.length > 120 && <p className="mt-2 text-sm text-zinc-500">Showing 120 of {rows.length} — refine the filter.</p>}
      </NoSsr>
    </>
  );
}
