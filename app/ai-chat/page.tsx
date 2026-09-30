"use client";

import { useState } from "react";

interface Turn {
  role: string;
  body: string;
}

export default function AiChatPage() {
  const [threadId, setThreadId] = useState<number | undefined>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const msg = input;
    setInput("");
    setTurns((t) => [...t, { role: "user", body: msg }]);
    setBusy(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, message: msg }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setThreadId(data.threadId);
      setTurns((t) => [...t, { role: "assistant", body: data.reply }]);
    } else {
      setTurns((t) => [...t, { role: "assistant", body: "Sign in as a team member to chat." }]);
    }
    setBusy(false);
  }

  return (
    <div className="wrap section max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Team</p>
      <h1 className="display-1 mt-2">AI Chat</h1>
      <div className="mt-4 space-y-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        {turns.length === 0 && <p className="text-sm text-zinc-500">Ask about offers, copy, or client work. Replies need a provider key.</p>}
        {turns.map((t, i) => (
          <p key={i} className={t.role === "user"
            ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-white dark:text-zinc-900"
            : "w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800"}>{t.body}</p>
        ))}
        {busy && <p className="text-sm text-zinc-500">Thinking…</p>}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" maxLength={4000}
          className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button disabled={busy} className="beam beam-rainbow btn-dark min-h-[44px] shrink-0 rounded-full px-5 text-sm font-semibold disabled:opacity-60">Send</button>
      </form>
    </div>
  );
}
