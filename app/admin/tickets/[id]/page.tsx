import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTicket } from "@/lib/tickets";
import { requireTeam } from "@/lib/auth";
import { timeAgo } from "@/lib/timeago";

async function act(form: FormData) {
  "use server";
  const me = await requireTeam();
  const { setTicketStatus, assignTicket, resolveTicket, watch } = await import("@/lib/tickets");
  const id = Number(form.get("id"));
  const op = String(form.get("op"));
  const actor = me.email;
  if (op === "status") await setTicketStatus(id, String(form.get("status")) as "open" | "pending" | "resolved" | "closed" | "spam", actor);
  else if (op === "assign") { await assignTicket(id, String(form.get("assignee") || ""), actor); }
  else if (op === "resolve") { await resolveTicket(id, actor, String(form.get("resolution") || "")); }
  else if (op === "watch") { watch(id, String(form.get("email") || "")); }
  else if (op === "note") {
    const { logEvent } = await import("@/lib/tickets");
    logEvent(id, actor, "note", String(form.get("body") || "").slice(0, 2000));
  }
  revalidatePath(`/admin/tickets/${id}`);
}

export default async function TicketDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = getTicket(Number(id));
  if (!t) notFound();
  return (
    <>
      <Link href="/admin/tickets" className="text-sm font-semibold text-brand-deep">← All tickets</Link>
      <h1 className="mt-1 text-2xl font-extrabold">#{t.id} {t.subject}</h1>
      <p className="mt-1 font-mono text-xs text-zinc-500">
        {t.email}{t.phone ? ` · ${t.phone}` : ""} · <b>{t.status}</b>
        {t.escalated ? " · escalated" : ""} · {t.assigneeEmail ? `owner ${t.assigneeEmail}` : "unassigned"} · opened {timeAgo(t.createdAt) || t.createdAt.slice(0, 10)}
      </p>
      <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-black/10 p-3 text-sm dark:border-white/10">{t.body}</p>

      {t.attachments.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-bold">Attachments</p>
          <ul className="mt-1 space-y-1 text-sm">
            {t.attachments.map((a) => (
              <li key={a.id}>
                {a.status === "clean" ? (
                  <a className="underline" href={`/api/support/tickets/${t.id}/files/${a.id}`}>{a.filename}</a>
                ) : (
                  <span>{a.filename} · {a.status === "pending" ? "scanning…" : "quarantined"}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mt-6 font-bold">Timeline</h2>
      <ul className="mt-2 space-y-1.5 text-sm">
        {t.events.map((e, i) => (
          <li key={i} className="rounded-xl border border-black/10 p-2 dark:border-white/10">
            <b>{e.kind}</b> · {e.actor} · <span className="font-mono text-xs text-zinc-500">{e.createdAt.slice(0, 16).replace("T", " ")}</span>
            <p className="mt-0.5 whitespace-pre-wrap">{e.body}</p>
          </li>
        ))}
        {t.events.length === 0 && <li className="text-zinc-500">No events yet.</li>}
      </ul>

      <h2 className="mt-6 font-bold">Manage</h2>
      <div className="mt-2 grid max-w-2xl gap-2">
        <form action={act} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="op" value="status" />
          <select name="status" defaultValue={t.status} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
            {["open", "pending", "resolved", "closed", "spam"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Set status</button>
        </form>
        <form action={act} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="op" value="assign" />
          <input name="assignee" defaultValue={t.assigneeEmail} placeholder="Owner email" maxLength={120} className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Assign + watch</button>
        </form>
        <form action={act} className="grid gap-2">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="op" value="resolve" />
          <textarea name="resolution" rows={2} placeholder="Resolution summary (posted to the loop)" maxLength={2000} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
          <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Resolve with note</button>
        </form>
        <form action={act} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="op" value="note" />
          <input name="body" placeholder="Internal note…" maxLength={2000} className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Add note</button>
        </form>
        <form action={act} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={t.id} />
          <input type="hidden" name="op" value="watch" />
          <input name="email" placeholder="Watch teammate email" maxLength={120} className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Add watcher</button>
        </form>
      </div>
    </>
  );
}
