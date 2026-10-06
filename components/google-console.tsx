"use client";

import { Plus } from "lucide-react";

import { useEffect, useState } from "react";

interface Status {
  configured: boolean; keySource: string; connected: boolean;
  calendarId: string; needsReconnect: boolean;
  recent: { docId: string; title: string; at: string }[];
}
interface DriveFile { id: string; name: string; mimeType: string; modifiedTime: string; webViewLink: string }

export function GoogleConsole({ gcal }: { gcal: string | null }) {
  const [st, setSt] = useState<Status | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await fetch("/api/google/status").then((r) => r.json()).catch(() => null);
    if (d && !d.error) setSt(d);
    const f = await fetch("/api/google/drive?limit=10").then((r) => r.json()).catch(() => null);
    if (f?.ok) setFiles(f.files);
  }

  useEffect(() => { void load(); }, []);

  async function connect() {
    const d = await fetch("/api/gcal/connect").then((r) => r.json()).catch(() => null);
    if (d?.url) window.location.href = d.url;
    else setMsg(d?.note ?? d?.error ?? "connect failed");
  }

  async function search() {
    const f = await fetch(`/api/google/drive?q=${encodeURIComponent(q)}&limit=10`).then((r) => r.json()).catch(() => null);
    if (f?.ok) setFiles(f.files);
    else setMsg(f?.error ?? "drive failed");
  }

  async function create() {
    setMsg("Creating…");
    const res = await fetch("/api/google/docs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, text }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Created ✓ ${d.url}` : (d.error ?? "create failed"));
    if (res.ok) { setTitle(""); setText(""); void load(); }
  }

  async function readDoc(id: string, fallback: string) {
    const d = await fetch(`/api/google/docs?id=${encodeURIComponent(id)}`).then((r) => r.json()).catch(() => null);
    setMsg(d?.ok ? `${d.title || fallback}: ${d.text.slice(0, 500)}` : (d?.error ?? "read failed"));
  }

  return (
    <div className="grid gap-3">
      {gcal === "ok" && <p className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700">Google connected ✓</p>}
      {gcal === "fail" && <p className="rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-700">Google connect failed — check keys, then retry.</p>}
      <div className="rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
        <p className="font-bold">Connection</p>
        {!st ? <p className="mt-1 text-zinc-500">Loading…</p> : (
          <div className="mt-1 space-y-1 text-zinc-600 dark:text-zinc-300">
            <p>Keys: {st.configured ? `set (${st.keySource})` : "missing — add in Notify → Providers → google"}</p>
            <p>Account: {st.connected ? `${st.calendarId}` : "not connected"}</p>
            {st.needsReconnect && <p className="font-semibold text-amber-700">Old consent covers Calendar only — reconnect to grant Drive/Docs.</p>}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button onClick={() => void connect()} className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">
                {st.connected ? "Reconnect Google" : "Connect Google"}
              </button>
              <a href="/admin/notify?tab=providers" className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Keys (Providers)</a>
            </div>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
        <p className="font-bold">Drive — recent files</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" maxLength={100}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
          <button onClick={() => void search()} className="min-h-[44px] rounded-xl border border-black/15 px-4 font-semibold dark:border-white/20">Search</button>
        </div>
        <ul className="mt-2 space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
              <span className="min-w-0 flex-1 truncate">{f.name} <span className="text-xs text-zinc-500">{f.modifiedTime.slice(0, 10)}</span></span>
              <a href={f.webViewLink} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold text-brand-deep underline">Open</a>
            </li>
          ))}
          {files.length === 0 && <li className="text-zinc-500">No files yet — connect Google, then files appear here.</li>}
        </ul>
      </div>
      <div className="rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
        <p className="font-bold">Docs — create</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" maxLength={150}
          className="mt-2 min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Body text…" rows={4} maxLength={15000}
          className="mt-1.5 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
        <button onClick={() => void create()} disabled={!title.trim()}
          className="mt-1.5 min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Create Google Doc</button>
        {st && st.recent.length > 0 && (
          <ul className="mt-2 space-y-1">
            {st.recent.map((r) => (
              <li key={r.docId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <button onClick={() => void readDoc(r.docId, r.title)} className="shrink-0 text-sm font-semibold text-brand-deep underline">Preview</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {msg && <p className="break-words text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
