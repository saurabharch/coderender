"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Plus, Pencil, Trash2, Paperclip } from "lucide-react";
import { RichText } from "@/components/rich-blocks";

interface Turn {
  role: string;
  body: string;
}

interface Thread {
  id: number;
  title: string;
}

export default function AiChatPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<number | undefined>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  async function loadThreads() {
    const res = await fetch("/api/chat/threads-team").catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (Array.isArray(data?.threads)) setThreads(data.threads);
  }

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, streaming]);

  async function openThread(id: number | undefined) {
    setThreadId(id);
    setTurns([]);
    if (!id) return;
    const res = await fetch(`/api/chat/threads-team?id=${id}`).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (Array.isArray(data?.messages)) setTurns(data.messages);
  }

  async function renameThread(id: number) {
    const title = prompt("Rename conversation:");
    if (!title) return;
    await fetch("/api/chat/threads-team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    }).catch(() => {});
    void loadThreads();
  }

  async function deleteThread(id: number) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/chat/threads-team?id=${id}`, { method: "DELETE" }).catch(() => {});
    if (threadId === id) {
      setThreadId(undefined);
      setTurns([]);
    }
    void loadThreads();
  }

  async function attach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/media/upload", { method: "POST", body: form }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (data?.url) setInput((s) => `${s} [image: ${data.url}]`.trim());
    e.target.value = "";
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput("");
    setTurns((t) => [...t, { role: "user", body: msg }]);
    setBusy(true);
    setStreaming("");
    const t0 = Date.now();
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, message: msg }),
    }).catch(() => null);
    if (!res || !res.ok || !res.body) {
      setBusy(false);
      return;
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    let doneInfo: { threadId?: number } = {};
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n\n");
      buf = parts.pop() ?? "";
      for (const p of parts) {
        const line = p.trim();
        if (!line.startsWith("data:")) continue;
        try {
          const o = JSON.parse(line.slice(5));
          if (o.token) {
            text += o.token;
            setStreaming(text);
          }
          if (o.done) {
            doneInfo = o;
          }
          if (o.error) {
            setTurns((t) => [...t, { role: "assistant", body: "Chat failed — try again." }]);
          }
        } catch { /* partial */ }
      }
    }
    if (doneInfo.threadId) setThreadId(doneInfo.threadId);
    if (text) setTurns((t) => [...t, { role: "assistant", body: text }]);
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "chat", path: "/ai-chat", data: `ms=${Date.now() - t0}` }),
        keepalive: true,
      });
    } catch { /* ignore */ }
    setStreaming("");
    setBusy(false);
    void loadThreads();
  }

  return (
    <div className="wrap section max-w-6xl">
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <button onClick={() => openThread(undefined)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white">
            <Plus size={16} /> New chat
          </button>
          <ul className="mt-2 space-y-1">
            {threads.map((t) => (
              <li key={t.id} className={`group flex items-center gap-1 rounded-xl px-2 ${t.id === threadId ? "bg-black/5 dark:bg-white/10" : ""}`}>
                <button onClick={() => openThread(t.id)} className="min-h-[44px] flex-1 truncate text-left text-sm font-medium">
                  {t.title || `Chat #${t.id}`}
                </button>
                <button onClick={() => renameThread(t.id)} aria-label="Rename" className="p-2 opacity-60 hover:opacity-100"><Pencil size={14} /></button>
                <button onClick={() => deleteThread(t.id)} aria-label="Delete" className="p-2 opacity-60 hover:opacity-100"><Trash2 size={14} /></button>
              </li>
            ))}
            {threads.length === 0 && <li className="px-2 text-sm text-zinc-500">No conversations yet.</li>}
          </ul>
        </aside>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Team</p>
          <h1 className="display-1 mt-1">AI Chat</h1>
          <div className="mt-4 min-h-[300px] space-y-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
            {turns.length === 0 && !streaming && <p className="text-sm text-zinc-500">Ask about offers, copy, or client work. Streaming, history, attachments.</p>}
            {turns.map((t, i) => (
              <p key={i} className={t.role === "user"
                ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-white dark:text-zinc-900"
                : "w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800"}>
                <RichText text={t.body} />
              </p>
            ))}
            {streaming && <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">{streaming}▍</p>}
            <div ref={bottom} />
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
            <label aria-label="Attach image" className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/15 dark:border-white/20">
              <Paperclip size={18} />
              <input type="file" accept="image/*" className="hidden" onChange={attach} />
            </label>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" maxLength={4000}
              className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
            <button disabled={busy} className="beam beam-rainbow btn-dark min-h-[44px] shrink-0 rounded-full px-5 text-sm font-semibold disabled:opacity-60">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
}
