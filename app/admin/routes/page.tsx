import { ROUTES } from "@/lib/plugins/manifest";

export default async function RoutesPage() {
  const env = process.env.INNGEST_ENV || "development";
  const app = process.env.INNGEST_APP_ID || "coderender";
  const mode = process.env.INNGEST_EVENT_KEY ? "inngest cloud" : "local runner";
  return (
    <>
      <h1 className="text-2xl font-extrabold">Route registry</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Single source: <code>lib/plugins/manifest.ts</code> — feeds /api/docs and /api/openapi.json. Jobs: {mode} · app <code>{app}</code> · env <code>{env}</code>.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[640px] text-left font-mono text-xs">
          <tbody>
            {ROUTES.map((r) => (
              <tr key={r.method + r.path} className="border-b border-black/5 dark:border-white/5">
                <td className="px-3 py-2 font-bold">{r.method}</td>
                <td className="px-3 py-2">{r.path}</td>
                <td className="px-3 py-2">{r.auth}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
