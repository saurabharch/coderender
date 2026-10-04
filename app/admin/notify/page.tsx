import Link from "next/link";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { sessionUser } from "@/lib/auth";
import { broadcastPush } from "@/lib/push";
import { requireTeam } from "@/lib/auth";
import { NotifyConsole } from "@/components/notify-console";
import { ProviderTabs } from "@/components/provider-tabs";

async function broadcast(form: FormData) {
  "use server";
  await requireTeam();
  const user = await sessionUser();
  const title = String(form.get("title") || "").slice(0, 120);
  const body = String(form.get("body") || "").slice(0, 2000);
  if (!title) return;
  getDb().prepare("INSERT INTO Notification (title, body, audience, kind, target) VALUES (?,?,?,?,?)")
    .run(title, body, String(form.get("audience") || "team"), "info", String(form.get("audience") || "team"));
  broadcastPush(title, body).catch(() => {});
  revalidatePath("/admin/notify");
}

export default async function NotifyPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "providers" ? "providers" : "messages";
  return (
    <>
      <h1 className="text-2xl font-extrabold">Notifications</h1>
      <nav className="mt-3 flex gap-2" aria-label="Notify">
        {(["messages", "providers"] as const).map((t) => (
          <Link key={t} href={`/admin/notify${t === "messages" ? "" : "?tab=providers"}`}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-semibold capitalize ${t === tab ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>{t}</Link>
        ))}
      </nav>
      {tab === "providers" ? (
        <div className="mt-4">
          <p className="mb-3 text-sm text-zinc-500">AES-sealed in the database, masked in this UI, tested live. Dashboard values override env. System harness for all operational comms.</p>
          <ProviderTabs />
        </div>
      ) : (
        <>
          <form action={broadcast} className="mt-4 grid max-w-xl gap-3 rounded-2xl border border-black/10 p-4 dark:border-white/10">
            <label className="grid gap-1 text-sm">Title<input name="title" required maxLength={120} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
            <label className="grid gap-1 text-sm">Body<textarea name="body" rows={3} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" /></label>
            <label className="grid gap-1 text-sm">Audience
              <select name="audience" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
                <option value="team">Team (in-app)</option>
                <option value="all">All users (in-app)</option>
              </select>
            </label>
            <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Broadcast</button>
          </form>
          <div className="mt-4"><NotifyConsole /></div>
        </>
      )}
    </>
  );
}
