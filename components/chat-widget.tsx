"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, ShieldCheck } from "lucide-react";

interface Turn {
  role: string;
  body: string;
}

type Phase = "idle" | "thinking" | "researching" | "typing";

const HINTS = ["@pricing rates?", "#booking weekend slot", "/demo", "/human"];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [human, setHuman] = useState(false);
  const [captcha, setCaptcha] = useState<{ id: string; question: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [threadId, setThreadId] = useState<number | undefined>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [limited, setLimited] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener("cr:chat-toggle", toggle);
    return () => window.removeEventListener("cr:chat-toggle", toggle);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy, phase]);

  async function loadCaptcha() {
    const res = await fetch("/api/captcha").catch(() => null);
    const data = await res?.json().catch(() => null);
    if (data?.id) setCaptcha({ id: data.id, question: data.question });
  }

  useEffect(() => {
    if (open && !human && !captcha) void loadCaptcha();
  }, [open, human, captcha]);

  async function solve(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/captcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: captcha?.id, answer: Number(answer) }),
    });
    if (res.ok) {
      setHuman(true);
    } else {
      void loadCaptcha();
      setAnswer("");
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput("");
    setTurns((t) => [...t, { role: "user", body: msg }]);
    setBusy(true);
    setPhase("thinking");
    const researchTimer = setTimeout(() => setPhase("researching"), 3000);
    let fp: string | undefined;
    try { fp = localStorage.getItem("cr_fp") ?? undefined; } catch { /* ignore */ }
    const res = await fetch("/api/chat-public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, message: msg, fingerprint: fp }),
    });
    clearTimeout(researchTimer);
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 429 || res.status === 403) {
      setLimited(true);
      setPhase("idle");
      return;
    }
    if (res.ok) {
      setThreadId(data.threadId);
      setPhase("typing");
      setTimeout(() => {
        setTurns((t) => [...t, { role: "assistant", body: data.reply }]);
        setPhase("idle");
      }, 700);
    } else {
      setPhase("idle");
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI chat" : "Chat with AI assistant"}
        className="beam beam-rainbow fixed bottom-24 right-4 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl md:flex dark:bg-white dark:text-zinc-900"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>
      {open && (
        <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-h-[60vh] w-auto max-w-md flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl dark:border-white/15 dark:bg-zinc-950 md:inset-x-auto md:right-4 md:w-[380px]" role="dialog" aria-label="AI assistant chat">
          <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3 dark:border-white/10">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white"><Bot size={16} /></span>
            <div>
              <p className="text-sm font-bold">CodeRender AI · Riya</p>
              <p className="text-xs text-zinc-500">Sales executive · replies with researched prices</p>
            </div>
          </div>
          {!human ? (
            <form onSubmit={solve} className="grid gap-2 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} /> Quick check — are you human?</p>
              <p className="text-sm">{captcha ? captcha.question : "Loading…"}</p>
              <div className="flex gap-2">
                <input value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode="numeric" placeholder="Your answer"
                  aria-label="Captcha answer"
                  className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                <button className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Go</button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {turns.length === 0 && <p className="text-sm text-zinc-500">Hi, I am Riya! Tell me about your business — I will ask 3 quick questions, then come back with researched prices.</p>}
                {turns.map((t, i) => (
                  <p key={i} className={t.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-900 px-3 py-2 text-sm text-white dark:bg-white dark:text-zinc-900"
                    : "w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800"}>{t.body}</p>
                ))}
                {busy && <p className="text-xs font-semibold text-brand-deep">
                  {phase === "thinking" && "Thinking…"}
                  {phase === "researching" && "Researching services & prices…"}
                </p>}
                {phase === "typing" && <p className="text-xs font-semibold text-brand-deep">Typing…</p>}
                {limited && <p className="text-sm font-semibold text-amber-600">Slow down — hourly limit reached, or solve the check again.</p>}
                <div ref={bottom} />
              </div>
              <div className="flex flex-wrap gap-1.5 px-3">
                {HINTS.map((h) => (
                  <button key={h} onClick={() => setInput(h)} className="rounded-full border border-black/10 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:border-white/15 dark:text-zinc-400">{h}</button>
                ))}
              </div>
              <form onSubmit={send} className="flex gap-2 border-t border-black/10 p-3 dark:border-white/10">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything… (@agent #topic /command)" maxLength={1000} aria-label="Your message"
                  className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                <button disabled={busy} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-60"><Send size={18} /></button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
