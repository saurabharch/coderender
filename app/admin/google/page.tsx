import { GoogleConsole } from "@/components/google-console";

export default async function GooglePage({ searchParams }: { searchParams: Promise<{ gcal?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Integrations</p>
      <h1 className="display-1 mt-1">Google</h1>
      <p className="mb-4 mt-1 text-sm text-zinc-500">
        Calendar sync, Drive files, and Docs — one OAuth consent. Keys live in the dashboard vault
        (Notify → Providers → google); connect once per team member.
      </p>
      <GoogleConsole gcal={sp.gcal ?? null} />
    </>
  );
}
