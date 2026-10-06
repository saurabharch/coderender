"use client";

import { useEffect, useState } from "react";
import { renderTemplate } from "@/lib/wa-crm-core";

interface Convo {
  phone: string; name: string; stopped: number; sentiment: number;
  unread: number; lastAt: string; lastBody: string;
}

interface Msg { id: number; body: string; kind: string; createdAt: string }
interface Tpl { id: number; name: string; body: string; lang: string; active: number }

export function WaInbox() {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [phone, setPhone] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [tpls, setTpls] = useState<Tpl[]>([]);
  const [tplName, setTplName] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [tplVars, setTplVars] = useState("");
  const [notice, setNotice] = useState("");

  async function loadConvos() {
    const d = await fetch("/api/wa/inbox").then((r) => r.json()).catch(() => null);
    if (Array.isArray(d?.conversations)) setConvos(d.conversations);
  }

  async function loadTpls() {
    const d = await fetch("/api/wa/templates").then((r) => r.json()).catch(() => null);
    if (Array.isArray(d?.templates)) setTpls(d.templates);
  }

  async function open(p: string) {
    setPhone(p);
    setText("");
    const d = await fetch(`/api/wa/inbox?phone=${encodeURIComponent(p)}`).then((r) => r.json()).catch(() => null);
    if (Array.isArray(d?.thread)) setMsgs([...d.thread].reverse());
    void loadConvos();
  }

  useEffect(() => {
    void loadConvos();
    void loadTpls();
  }, []);

  async function send() {
    if (!text.trim() || !phone) return;
    setNotice("");
    const res = await fetch("/api/wa/inbox", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, body: text.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setNotice(data?.error || "Send failed");
      return;
    }
    setText("");
    void open(phone);
  }

  async function saveTpl() {
    if (!tplName.trim() || !tplBody.trim()) return;
    await fetch("/api/wa/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tplName.trim(), body: tplBody.trim() }),
    }).catch(() => {});
    setTplName("");
    setTplBody("");
    void loadTpls();
  }

  const active = convos.find((c) => c.phone === phone);

  return (
    <div className="grid gap-3 md:grid-cols-[260px_1fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Conversations</p>
        <ul className="mt-1 max-h-[60vh] space-y-1 overflow-y-auto">
          {convos.map((c) => (
            <li key={c.phone}>
              <button onClick={() => void open(c.phone)}
                className={`flex min-h-[56px] w-full items-center gap-2 rounded-xl px-3 text-left ${c.phone === phone ? "bg-brand/10" : "hover:bg-black/5 dark:hover:bg-white/10"}`}>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{c.name || c.phone}</b>
                  <span className="block truncate text-xs text-zinc-500">{c.lastBody || "—"}</span>
                </span>
                {c.stopped ? <span title="Opted out" className="text-xs">🚫</span> : null}
                {c.sentiment <= -0.4 ? <span title="Negative" className="text-xs">😠</span> : null}
                {c.unread > 0 && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">{c.unread}</span>}
              </button>
            </li>
          ))}
          {convos.length === 0 && <li className="px-2 text-sm text-zinc-500">No conversations yet — inbound webhook messages land here.</li>}
        </ul>
      </div>
      <div>
        {!phone ? (
          <p className="rounded-2xl border border-black/10 p-6 text-sm text-zinc-500 dark:border-white/10">Pick a conversation ←</p>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <b>{active?.name || phone}</b>
              <span className="font-mono text-xs text-zinc-500">{phone}</span>
              {active?.stopped ? <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-700">STOP — replies blocked</span> : null}
            </p>
            <ul className="mt-2 max-h-[46vh] space-y-1.5 overflow-y-auto rounded-2xl border border-black/10 p-3 dark:border-white/10">
              {msgs.map((m) => (
                <li key={m.id} className={m.kind === "out"
                  ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-sm text-white"
                  : "w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800"}>
                  {m.body}
                  <span className="block text-[10px] opacity-60">{m.createdAt.slice(0, 16).replace("T", " ")}</span>
                </li>
              ))}
              {msgs.length === 0 && <li className="text-sm text-zinc-500">No messages yet.</li>}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1">
              <input value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
                placeholder={active?.stopped ? "Opted out — cannot reply" : "Reply… (Enter to send)"}
                maxLength={2000} disabled={active?.stopped === 1}
                className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm disabled:opacity-50 dark:border-white/20" />
              <button onClick={() => void send()} disabled={!text.trim()}
                className="min-h-[44px] shrink-0 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50">Send</button>
            </div>
            {notice && <p className="mt-1 text-xs text-red-600">{notice}</p>}
            <details className="mt-2">
              <summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-brand-deep">Templates</summary>
              <ul className="mt-1 space-y-1 text-sm">
                {tpls.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
                    <span className="min-w-0 flex-1"><code className="text-xs">{t.name}</code> <span className="text-xs text-zinc-500">{t.body.slice(0, 80)}</span></span>
                    <button onClick={() => setText(renderTemplate(t.body, tplVars.split("|").map((s) => s.trim())))}
                      className="min-h-[36px] rounded-lg border border-black/15 px-2.5 text-xs dark:border-white/20">Use ↓</button>
                    <button aria-label="Delete template" onClick={async () => {
                      await fetch(`/api/wa/templates?id=${t.id}`, { method: "DELETE" }).catch(() => {});
                      void loadTpls();
                    }} className="min-h-[36px] px-1.5 text-xs opacity-60 hover:opacity-100">✕</button>
                  </li>
                ))}
              </ul>
              <div className="mt-1 flex flex-wrap gap-1">
                <input value={tplVars} onChange={(e) => setTplVars(e.target.value)} placeholder="Variables a|b (for {{1}} {{2}})"
                  className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="name_like_this" maxLength={60}
                  className="min-h-[44px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                <input value={tplBody} onChange={(e) => setTplBody(e.target.value)} placeholder="Hi {{1}}, …" maxLength={2000}
                  className="min-h-[44px] flex-[2] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                <button onClick={() => void saveTpl()} className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">Save</button>
              </div>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
