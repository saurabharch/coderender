import Link from "next/link";
import { revalidatePath } from "next/cache";
import { listJobs, purgeJobs, queueDepth, retryJob, runQueueTick } from "@/lib/queue";
import { SubTabs } from "@/components/admin-ui";
import { CheckCircle2, Clock, Inbox, Skull, LayoutList } from "lucide-react";
import { requireTeam } from "@/lib/auth";

async function tick() {
  "use server";
  await requireTeam();
  await runQueueTick(10);
  revalidatePath("/admin/ops");
}

async function retry(form: FormData) {
  "use server";
  await requireTeam();
  retryJob(Number(form.get("id")));
  revalidatePath("/admin/ops");
}

async function purge(form: FormData) {
  "use server";
  await requireTeam();
  const s = String(form.get("status"));
  if (s === "done" || s === "dead") purgeJobs(s);
  revalidatePath("/admin/ops");
}

const STATUSES = ["queued", "running", "done", "dead"] as const;

export default async function OpsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const raw = (await searchParams).status ?? "";
  const status = (STATUSES as readonly string[]).includes(raw) ? raw : "";
  const depth = queueDepth();
  const jobs = listJobs(status || undefined, 50);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Ops queue</h1>
      <SubTabs active={status || "all"} label="Job status" tabs={[
        { id: "all", label: `All (${Object.values(depth).reduce((a, b) => a + (b ?? 0), 0)})`, Icon: LayoutList, href: "/admin/ops" },
        { id: "queued", label: `Queued (${depth.queued ?? 0})`, Icon: Inbox, href: "/admin/ops?status=queued" },
        { id: "running", label: `Running (${depth.running ?? 0})`, Icon: Clock, href: "/admin/ops?status=running" },
        { id: "done", label: `Done (${depth.done ?? 0})`, Icon: CheckCircle2, href: "/admin/ops?status=done" },
        { id: "dead", label: `Dead (${depth.dead ?? 0})`, Icon: Skull, href: "/admin/ops?status=dead" },
      ]} />
      <p className="mt-1 font-mono text-xs"><Link href="/api/ops/run" className="underline">run tick</Link></p>
      <form action={tick} className="mt-3">
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Run worker tick now</button>
      </form>
      <ul className="mt-4 space-y-1 font-mono text-xs">
        {jobs.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <b>#{j.id}</b> {j.kind} · {j.status} · try {j.attempts} · {j.createdAt.slice(0, 16).replace("T", " ")}
            {j.error && <span className="text-red-600">{j.error.slice(0, 100)}</span>}
            {j.status === "dead" && (
              <form action={retry}><input type="hidden" name="id" value={j.id} />
                <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Retry</button></form>
            )}
          </li>
        ))}
        {jobs.length === 0 && <li className="text-zinc-500">Queue empty.</li>}
      </ul>
      <div className="mt-3 flex gap-2">
        {(["done", "dead"] as const).map((s) => (
          <form key={s} action={purge}><input type="hidden" name="status" value={s} />
            <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Purge {s}</button></form>
        ))}
      </div>
    </>
  );
}
