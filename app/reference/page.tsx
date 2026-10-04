import { redirect } from "next/navigation";
import { openApiDoc } from "@/lib/plugins/manifest";
import { sessionUser } from "@/lib/auth";

const AUTH_COLOR: Record<string, string> = {
  public: "bg-emerald-500/15 text-emerald-700",
  team: "bg-sky-500/15 text-sky-700",
  key: "bg-violet-500/15 text-violet-700",
  partner: "bg-amber-500/15 text-amber-700",
};

export default async function ReferencePage() {
  const user = await sessionUser();
  if (!user) redirect("/login");
  const doc = openApiDoc() as {
    info: { title: string; version: string };
    tags: { name: string }[];
    paths: Record<string, Record<string, {
      tags: string[]; operationId: string; summary: string;
      parameters: { name: string; in: string; required: boolean }[];
      requestBody?: { content: { "application/json": { example: string } } };
      "x-cr-auth": string;
    }>>;
  };
  return (
    <div className="wrap section max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Team</p>
      <h1 className="display-1 mt-1">{doc.info.title} <span className="text-lg text-zinc-500">v{doc.info.version}</span></h1>
      <p className="mt-1 text-sm text-zinc-500">
        <span className="font-mono">GET /api/openapi.json</span> is the machine contract (agents + Inngest jobs read it).
        Auth: <b>public</b> open · <b>team</b> session cookie · <b>key</b> <code>x-api-key: cr_…</code>
      </p>
      {doc.tags.map((t) => {
        const rows = Object.entries(doc.paths).filter(([, ops]) =>
          Object.values(ops).some((o) => o.tags.includes(t.name)));
        if (!rows.length) return null;
        return (
          <section key={t.name} className="mt-6">
            <h2 className="font-extrabold capitalize">{t.name}</h2>
            <ul className="mt-2 space-y-2">
              {rows.map(([path, ops]) => Object.entries(ops).map(([method, o]) => (
                <li key={`${method}${path}`} className="rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10">
                  <p className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-black/10 px-2 py-0.5 font-mono text-xs uppercase dark:bg-white/15">{method}</code>
                    <code className="font-mono text-xs">{path}</code>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${AUTH_COLOR[o["x-cr-auth"]] ?? ""}`}>{o["x-cr-auth"]}</span>
                  </p>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{o.summary}</p>
                  {o.parameters.length > 0 && (
                    <p className="mt-1 font-mono text-xs text-zinc-500">
                      params: {o.parameters.map((p) => `${p.in === "path" ? "{" : "?"}${p.name}${p.in === "path" ? "}" : ""}`).join(" ")}
                    </p>
                  )}
                  {o.requestBody && (
                    <p className="mt-1 font-mono text-xs text-zinc-500">body: {o.requestBody.content["application/json"].example}</p>
                  )}
                </li>
              )))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
