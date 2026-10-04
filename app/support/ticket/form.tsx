"use client";

import { useState } from "react";

export function TicketForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support/ticket", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't file the ticket.");
      setDone(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't file the ticket.");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = "min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20";

  if (done) {
    return (
      <p className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-semibold">
        Ticket #{done} filed. Keep the number — quote it in any follow-up.
      </p>
    );
  }
  return (
    <form onSubmit={submit} className="mt-4 grid gap-2">
      <div className="grid gap-2 md:grid-cols-3">
        <input value={form.name} onChange={set("name")} placeholder="Your name" maxLength={80} className={input} />
        <input value={form.email} onChange={set("email")} type="email" required placeholder="Email" maxLength={120} className={input} />
        <input value={form.phone} onChange={set("phone")} placeholder="Phone/WhatsApp (optional)" maxLength={20} className={input} />
      </div>
      <input value={form.subject} onChange={set("subject")} required placeholder="Subject (e.g. Bill for October looks off)" maxLength={160} className={input} />
      <textarea value={form.message} onChange={set("message")} required rows={5} minLength={10} maxLength={4000}
        placeholder="What happened? Include order/invoice numbers and dates." className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
      <button disabled={busy} className="min-h-[44px] w-fit rounded-xl bg-brand px-6 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "Filing…" : "File ticket →"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
