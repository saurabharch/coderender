import { ROUTES } from "@/lib/plugins/manifest";
import { RoutesExplorer } from "@/components/routes-explorer";

export default async function RoutesPage() {
  const env = process.env.INNGEST_ENV || "development";
  const app = process.env.INNGEST_APP_ID || "coderender";
  const mode = process.env.INNGEST_EVENT_KEY ? "inngest cloud" : "local runner";
  return (
    <>
      <h1 className="text-2xl font-extrabold">Route registry</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Single source: <code>lib/plugins/manifest.ts</code> — feeds /api/docs and /api/openapi.json. Jobs: {mode} · app <code>{app}</code> · env <code>{env}</code>.</p>
      <RoutesExplorer routes={ROUTES} />
    </>
  );
}
