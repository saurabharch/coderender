import Link from "next/link";
import { revalidatePath } from "next/cache";
import { listJobs, purgeJobs, queueDepth, retryJob, runQueueTick } from "@/lib/queue";
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

export default async function OpsPage() {
  const depth = queueDepth();
  const jobs = listJobs(undefined, 50);
  return (
    <>
      <h1 className="text-2xl font-extrabold">Ops queue</h1>
      <p className="mt-1 font-mono text-xs">
        {(["queued", "running", "done", "dead"] as const).map((s) => `${s}: ${depth[s] ?? 0}`).join(" · ")}
        {" · "}<Link href="/api/ops/run" className="underline">run tick</Link>
      </p>
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
