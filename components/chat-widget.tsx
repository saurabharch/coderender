"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, ShieldCheck, ThumbsUp, ThumbsDown, ArrowLeft, RotateCcw, History, Check, ChevronRight, ChevronLeft, Square, MessageCircle, Phone, Tag, CalendarCheck } from "lucide-react";

import { Blocks, RichText, type Block } from "./rich-blocks";
import { SliderWidget } from "./slider-captcha";
import { chime } from "@/lib/chime";

interface Turn {
  role: string;
  body: string;
  turnIdx?: number;
  voted?: string;
  blocks?: Block[];
  source?: string;
  options?: Opt[];
  optKey?: string;
  multi?: boolean;
  submitLabel?: string;
  back?: boolean;
  used?: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  kb: "from FAQ",
  ai: "AI",
  human: "human on the way",
  template: "instant answer",
};

interface Opt {
  id: string;
  label: string;
}

type Phase = "idle" | "thinking" | "researching" | "typing";

const STORE_KEY = "cr_chat";

function loadSaved(): { threadId?: number; turns: Turn[] } {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { turns: [] };
    const d = JSON.parse(raw);
    if (!d || !Array.isArray(d.turns)) return { turns: [] };
    return {
      threadId: typeof d.threadId === "number" ? d.threadId : undefined,
      turns: d.turns.filter((t: unknown): t is Turn =>
        !!t && typeof (t as Turn).body === "string" && ((t as Turn).role === "user" || (t as Turn).role === "assistant")).slice(-30),
    };
  } catch {
    return { turns: [] };
  }
}

function ActionIcon({ label }: { label: string }) {
  const t = label.toLowerCase();
  const Icon = /whatsapp|chat/.test(t) ? MessageCircle
    : /call|phone|tel/.test(t) ? Phone
    : /price|pricing|offer|coupon|audit/.test(t) ? Tag
    : /book|demo|contact|meet/.test(t) ? CalendarCheck
    : ChevronRight;
  return <Icon size={13} className="shrink-0 opacity-70" />;
}

function OptionStrip({ opts, multi, picked, onTap, onSubmit, submitLabel, back, onBack }: {
  opts: Opt[]; multi: boolean; picked: string[];
  onTap: (id: string, label: string) => void; onSubmit: () => void; submitLabel?: string;
  back: boolean; onBack: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const nudge = (dir: number) => scroller.current?.scrollBy({ left: dir * 220, behavior: "smooth" });
  const wide = opts.length > 4;
  const btn = (wide
    ? "flex min-h-[44px] w-40 shrink-0 snap-start flex-col items-start justify-center gap-0.5 rounded-2xl border px-3 py-2 text-left text-xs font-semibold"
    : "flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-xs font-semibold");
  const onCls = "border-brand bg-brand-soft dark:bg-white/10";
  const offCls = "border-black/15 dark:border-white/20";
  return (
    <div className="mt-2 flex items-center gap-1" role="group" aria-label="Suggested replies">
      {wide && (
        <button onClick={() => nudge(-1)} aria-label="Scroll options left"
          className="flex min-h-[44px] min-w-[36px] shrink-0 items-center justify-center rounded-full border border-black/15 dark:border-white/20">
          <ChevronLeft size={15} />
        </button>
      )}
      <div ref={scroller} className={wide ? "flex snap-x gap-2 overflow-x-auto pb-1" : "flex flex-wrap gap-2"}>
        {back && (
          <button onClick={onBack} className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border border-black/15 px-4 text-xs font-semibold dark:border-white/20">
            <ArrowLeft size={13} /> Back
          </button>
        )}
        {opts.map((o) => {
          const on = picked.includes(o.id);
          return (
            <button key={o.id} onClick={() => onTap(o.id, o.label)}
              aria-pressed={multi ? on : undefined}
              className={`${btn} ${on ? onCls : offCls}`}>
              <span className="flex items-center gap-1.5">
                {multi
                  ? (on ? <Check size={13} className="shrink-0" /> : <Square size={13} className="shrink-0 opacity-50" />)
                  : <ActionIcon label={o.label} />}
                <span className={wide ? "" : ""}>{o.label}</span>
              </span>
              {wide && multi && <span className="text-[10px] font-normal text-zinc-500">{on ? "selected" : "tap to select"}</span>}
            </button>
          );
        })}
        {multi && (
          <button onClick={onSubmit} disabled={picked.length === 0}
            className="flex min-h-[44px] shrink-0 snap-start items-center gap-1.5 rounded-full bg-brand px-4 text-xs font-semibold text-white disabled:opacity-50">
            <Send size={12} /> {submitLabel || "Submit"} ({picked.length})
          </button>
        )}
      </div>
      {wide && (
        <button onClick={() => nudge(1)} aria-label="Scroll options right"
          className="flex min-h-[44px] min-w-[36px] shrink-0 items-center justify-center rounded-full border border-black/15 dark:border-white/20">
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}

function AgentAvatar({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-11 w-11 text-base" : "h-8 w-8 text-xs";
  return (
    <span className={`relative flex ${box} shrink-0 items-center justify-center rounded-full font-extrabold text-white`}
      style={{ background: "linear-gradient(135deg,#5eead4 0%,#0d9488 55%,#065f46 100%)" }}
      aria-label="Riya is online">
      R
      <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3" aria-hidden>
        <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-zinc-950" />
      </span>
    </span>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [gate, setGate] = useState<"entry" | "captcha" | "otp" | "chat">("entry");
  const [human, setHuman] = useState(false);
  const [captcha, setCaptcha] = useState<{ id: string; question: string; at: number } | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [otpMode, setOtpMode] = useState<"support" | "partner">("support");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpPin, setOtpPin] = useState("");
  const [usePin, setUsePin] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const [gatePinShown, setGatePinShown] = useState("");
  const [threadId, setThreadId] = useState<number | undefined>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [restored, setRestored] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [draftRestored, setDraftRestored] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [limited, setLimited] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [showThreads, setShowThreads] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const [threadList, setThreadList] = useState<{ id: number; title: string }[]>([]);
  const [solveMs, setSolveMs] = useState<number | undefined>();

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener("cr:chat-toggle", toggle);
    return () => window.removeEventListener("cr:chat-toggle", toggle);
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, busy, phase, activeKey]);

  // Guest persistence: mirror thread + history to localStorage (no auth needed).
  // Logged-in team history lives server-side under /ai-chat instead.
  useEffect(() => {
    if (restored) return;
    setRestored(true);
    const saved = loadSaved();
    if (saved.turns.length > 0) {
      setThreadId(saved.threadId);
      setTurns(saved.turns);
      setHuman(true);
      setGate("chat");
    }
  }, [restored]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ threadId, turns: turns.slice(-30) }));
    } catch { /* storage full/blocked: chat still works */ }
  }, [threadId, turns, restored]);

  function newChat() {
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    setThreadId(undefined);
    setTurns([]);
    setActiveKey(null);
    setPicked([]);
    setLimited(false);
    setGate("entry");
    setHuman(false);
    setOtpMsg("");
    setGatePinShown("");
  }

  function chooseEntry(mode: "enquiry" | "support" | "partner") {
    if (mode === "enquiry") {
      fetch("/api/captcha/mode").then((r) => r.json()).then((d) => {
        setProvider(d.provider ?? "default");
        if (d.provider === "off") {
          setHuman(true);
          setGate("chat");
        } else {
          setGate("captcha");
        }
      }).catch(() => setGate("captcha"));
      return;
    }
    setOtpMode(mode);
    setGate("otp");
  }

  async function sendOtpEmail() {
    setOtpMsg("");
    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otpEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOtpMsg("That email didn't work — check it and retry.");
      return;
    }
    setUsePin(!!data.hasPin);
    setOtpMsg(data.hasPin
      ? "You have a gate PIN — enter it below."
      : data.devCode
        ? `Dev mode code: ${data.devCode} (email sending needs SMTP setup).`
        : "Code sent! Check your email (and WhatsApp once connected) — valid 15 minutes.");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    const body = usePin
      ? { email: otpEmail, pin: otpPin }
      : { email: otpEmail, code: otpCode };
    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setOtpMsg("Wrong code — try again (same code stays valid 15 min).");
      return;
    }
    if (data.gatePin) setGatePinShown(data.gatePin);
    setGate("chat");
    setHuman(true);
    const cmd = otpMode === "partner" ? "/partner" : "/support";
    setTurns((t) => [...t, { role: "user", body: cmd }]);
    await post(cmd);
  }

  // Draft memory: preserve what's typed across reloads; cleared on send.
  useEffect(() => {
    if (draftRestored) return;
    setDraftRestored(true);
    try {
      const d = localStorage.getItem("cr_draft");
      if (d) setInput(d.slice(0, 1000));
    } catch { /* ignore */ }
  }, [draftRestored]);

  useEffect(() => {
    if (!draftRestored) return;
    try {
      if (input) localStorage.setItem("cr_draft", input);
      else localStorage.removeItem("cr_draft");
    } catch { /* ignore */ }
  }, [input, draftRestored]);

  function autoresize() {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const line = 22;
    el.style.height = Math.min(el.scrollHeight, line * 3 + 16) + "px";
    el.style.overflowY = el.scrollHeight > line * 3 + 16 ? "auto" : "hidden";
  }

  useEffect(() => {
    autoresize();
  }, [input]);

  function clearInput() {
    setInput("");
    try { localStorage.removeItem("cr_draft"); } catch { /* ignore */ }
    inputRef.current?.focus();
  }

  async function loadCaptcha() {
    const res = await fetch("/api/captcha").catch(() => null);
    const data = await res?.json().catch(() => null);
    if (data?.id) setCaptcha({ id: data.id, question: data.question, at: Date.now() });
  }

  useEffect(() => {
    if (open && gate === "captcha" && !captcha && provider !== "slider") void loadCaptcha();
    if (open && gate === "captcha" && provider === null) {
      fetch("/api/captcha/mode").then((r) => r.json()).then((d) => setProvider(d.provider ?? "default")).catch(() => setProvider("default"));
    }
  }, [open, gate, captcha, provider]);

  async function solve(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/captcha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: captcha?.id, answer: Number(answer) }),
    });
    if (res.ok) {
      if (captcha) setSolveMs(Date.now() - captcha.at);
      setHuman(true);
      setGate("chat");
    } else {
      void loadCaptcha();
      setAnswer("");
    }
  }

  async function post(message: string, retry = true): Promise<void> {
    setBusy(true);
    setActiveKey(null);
    setPhase("thinking");
    setPicked([]);
    const researchTimer = setTimeout(() => setPhase("researching"), 3000);
    let fp: string | undefined;
    try { fp = localStorage.getItem("cr_fp") ?? undefined; } catch { /* ignore */ }
    let locale = "";
    try { locale = `${navigator.language} ${Intl.DateTimeFormat().resolvedOptions().timeZone}`; } catch { /* ignore */ }
    const res = await fetch("/api/chat-public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, message, fingerprint: fp, solveMs, locale }),
    });
    setSolveMs(undefined);
    clearTimeout(researchTimer);
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 429) {
      setLimited(true);
      setPhase("idle");
      return;
    }
    if (res.status === 403 && threadId && retry && data.error === "not your thread") {
      // Restored thread gone server-side: start fresh once, keep history visible.
      setThreadId(undefined);
      setPhase("idle");
      await post(message, false);
      return;
    }
    if (res.status === 403) {
      setLimited(true);
      setPhase("idle");
      return;
    }
    if (res.ok) {
      setThreadId(data.threadId);
      if (data.verify && (data.verify === "support" || data.verify === "partner")) {
        setOtpMode(data.verify);
        setGate("otp");
        setPhase("idle");
        return;
      }
      setPhase("typing");
      const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      setTimeout(() => {
        setTurns((t) => [...t, {
          role: "assistant", body: data.reply, turnIdx: data.turnIdx,
          blocks: data.blocks, source: data.source, optKey: key,
          options: data.options, multi: !!data.multi,
          submitLabel: data.submitLabel || "Submit", back: !!data.back,
        }]);
        chime("reply");
        if (data.options?.length) {
          setPicked([]);
          setActiveKey(key);
        }
        setPhase("idle");
      }, 700);
    } else {
      setPhase("idle");
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const msg = input.trim();
    setInput("");
    setTurns((t) => [...t, { role: "user", body: msg }]);
    await post(msg);
  }

  async function tapOption(key: string, id: string, label: string) {
    if (busy || key !== activeKey) return;
    const turn = turns.find((x) => x.optKey === key);
    if (turn?.multi) {
      setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
      return;
    }
    setTurns((t) => t.map((x) => (x.optKey === key ? { ...x, used: true } : x)));
    setActiveKey(null);
    setTurns((t) => [...t, { role: "user", body: label }]);
    await post(id);
  }

  async function submitMulti(key: string) {
    const turn = turns.find((x) => x.optKey === key);
    const opts = turn?.options ?? [];
    const labels = opts.filter((o) => picked.includes(o.id)).map((o) => o.label).join(", ");
    if (busy || picked.length === 0 || key !== activeKey) return;
    setTurns((t) => [...t, { role: "user", body: labels }]);
    setTurns((t) => t.map((x) => (x.optKey === key ? { ...x, used: true } : x)));
    setActiveKey(null);
    await post(picked.join(","));
  }

  async function goBack(key: string) {
    if (busy || key !== activeKey) return;
    setTurns((t) => [...t, { role: "user", body: "« back" }]);
    setTurns((t) => t.map((x) => (x.optKey === key ? { ...x, used: true } : x)));
    setActiveKey(null);
    await post("« back");
  }

  async function loadThreads() {
    setShowThreads((s) => !s);
    let fp = "";
    try { fp = localStorage.getItem("cr_fp") ?? ""; } catch { /* ignore */ }
    const res = await fetch(`/api/chat/threads?fp=${encodeURIComponent(fp)}`).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (Array.isArray(data?.threads)) setThreadList(data.threads);
  }

  async function openThread(id: number) {
    let fp = "";
    try { fp = localStorage.getItem("cr_fp") ?? ""; } catch { /* ignore */ }
    const res = await fetch(`/api/chat/threads?id=${id}&fp=${encodeURIComponent(fp)}`).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) return;
    let ai = 0;
    setTurns((data.messages ?? []).map((m: { role: string; body: string }) => {
      if (m.role === "assistant") ai += 1;
      return { role: m.role, body: m.body, turnIdx: m.role === "assistant" ? ai : undefined };
    }));
    setThreadId(id);
    setActiveKey(null);
    setPicked([]);
    setShowThreads(false);
    setGate("chat");
    setHuman(true);
  }

  async function vote(turnIdx: number | undefined, v: string, i: number) {
    if (turnIdx === undefined || !threadId) return;
    await fetch("/api/chat/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, turnIdx, vote: v }),
    }).catch(() => {});
    setTurns((t) => t.map((x, j) => (j === i ? { ...x, voted: v } : x)));
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI chat" : "Chat with AI assistant"}
        className="beam beam-rainbow fixed bottom-8 right-6 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-xl md:flex dark:bg-white dark:text-zinc-900"
      >
        {open ? <X size={22} /> : <Bot size={22} />}
      </button>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-0 z-50 mx-auto flex flex-col overflow-hidden border-black/10 bg-white shadow-2xl dark:border-white/15 dark:bg-zinc-950 md:inset-x-auto md:bottom-24 md:right-6 md:top-auto md:h-[640px] md:max-h-[80vh] md:w-[380px] md:rounded-3xl md:border" role="dialog" aria-label="AI assistant chat">
          <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3 dark:border-white/10">
            <AgentAvatar />
            <div className="flex-1">
              <p className="text-sm font-bold">CodeRender AI · Riya</p>
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden /> Online · replies instantly
              </p>
            </div>
            <button onClick={loadThreads} aria-label="Past conversations"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/15">
              <History size={15} />
            </button>
            <button onClick={newChat} aria-label="Start new chat"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 dark:border-white/15">
              <RotateCcw size={15} />
            </button>
            <button onClick={() => setOpen(false)} aria-label="Close chat"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
              <X size={16} />
            </button>
          </div>
          {showThreads && (
            <div className="max-h-40 overflow-y-auto border-b border-black/10 dark:border-white/10">
              {threadList.length === 0 && <p className="px-4 py-2 text-xs text-zinc-500">No past chats on this device yet.</p>}
              {threadList.map((t) => (
                <button key={t.id} onClick={() => openThread(t.id)}
                  className="block w-full truncate px-4 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10">
                  {t.title || `Chat #${t.id}`}
                </button>
              ))}
            </div>
          )}
          {gate === "entry" ? (
            <div className="grid gap-2 p-4">
              <p className="text-sm font-semibold">How can Riya help today?</p>
              {[
                { m: "enquiry" as const, t: "New Enquiry", d: "Services, prices & booking" },
                { m: "support" as const, t: "Support", d: "Orders, bills & tickets" },
                { m: "partner" as const, t: "Partner", d: "Dashboard, payouts & referrals" },
              ].map((x) => (
                <button key={x.m} onClick={() => chooseEntry(x.m)}
                  className="min-h-[52px] rounded-2xl border border-black/10 px-4 text-left hover:border-brand dark:border-white/15">
                  <span className="block text-sm font-bold">{x.t}</span>
                  <span className="block text-xs text-zinc-500">{x.d}</span>
                </button>
              ))}
            </div>
          ) : gate === "otp" ? (
            <div className="grid gap-2 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} /> {otpMode === "partner" ? "Partner" : "Support"} verification</p>
              <input value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)} type="email" placeholder="you@business.com"
                aria-label="Email for verification"
                className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <button onClick={sendOtpEmail} className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">Send code</button>
              <form onSubmit={verifyOtp} className="grid gap-2">
                <input value={usePin ? otpPin : otpCode} onChange={(e) => usePin ? setOtpPin(e.target.value) : setOtpCode(e.target.value)}
                  inputMode="numeric" placeholder={usePin ? "Your gate PIN" : "6-digit code"}
                  aria-label={usePin ? "Gate PIN" : "Verification code"}
                  className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Verify & continue</button>
              </form>
              {otpMsg && <p className="text-sm text-zinc-600 dark:text-zinc-400">{otpMsg}</p>}
              {gatePinShown && <p className="rounded-xl bg-brand-soft p-3 text-sm dark:bg-white/10">Your forever gate PIN: <b>{gatePinShown}</b> — save it, you will use it instead of email codes next time.</p>}
            </div>
          ) : gate === "captcha" ? (
            <div className="grid gap-2 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} /> Quick check — are you human?</p>
              {provider === "slider" ? (
                <SliderWidget onPass={() => { setHuman(true); setGate("chat"); }} />
              ) : (
                <form onSubmit={solve} className="grid gap-2">
                  <p className="text-sm">{captcha ? captcha.question : "Loading…"}</p>
                  <div className="flex gap-2">
                    <input value={answer} onChange={(e) => setAnswer(e.target.value)} inputMode="numeric" placeholder="Your answer"
                      aria-label="Captcha answer"
                      className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
                    <button className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Go</button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {turns.length === 0 && <p className="text-sm leading-relaxed text-zinc-500">Hi, I am Riya! Tell me about your business — a few quick taps and I will come back with researched prices.</p>}
                {turns.map((t, i) => (
                  <div key={i}>
                    <div className={t.role === "user"
                      ? "ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-900 px-3.5 py-2.5 text-sm leading-relaxed text-white dark:bg-white dark:text-zinc-900"
                      : "w-fit max-w-[95%] space-y-2 rounded-2xl rounded-bl-sm bg-zinc-100 px-3.5 py-2.5 text-sm leading-relaxed dark:bg-zinc-800"}>
                      <RichText text={t.body} />
                      {t.role === "assistant" && t.blocks && <Blocks blocks={t.blocks} />}
                      {t.role === "assistant" && t.source && SOURCE_LABEL[t.source] && (
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{SOURCE_LABEL[t.source]}</span>
                      )}
                    </div>
                    {t.role === "assistant" && t.options && t.options.length > 0 && t.optKey !== undefined && t.optKey === activeKey && !t.used && (
                      <OptionStrip
                        opts={t.options} multi={!!t.multi} picked={picked}
                        onTap={(id, label) => void tapOption(t.optKey as string, id, label)}
                        onSubmit={() => void submitMulti(t.optKey as string)}
                        submitLabel={t.submitLabel} back={!!t.back}
                        onBack={() => goBack(t.optKey as string)}
                      />
                    )}
                    {t.role === "assistant" && (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {(["up", "down"] as const).map((v) => (
                          <button key={v} onClick={() => vote(t.turnIdx, v, i)} aria-label={`Vote ${v}`}
                            className={`rounded-full border p-1.5 ${t.voted === v ? "border-brand bg-brand-soft" : "border-black/10 dark:border-white/15"}`}>
                            {v === "up" ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
                          </button>
                        ))}
                      </span>
                    )}
                  </div>
                ))}
                {busy && <p className="text-xs font-semibold text-brand-deep">
                  {phase === "thinking" && "Thinking…"}
                  {phase === "researching" && "Researching services & prices…"}
                </p>}
                {phase === "typing" && <p className="text-xs font-semibold text-brand-deep">Typing…</p>}
                {limited && <p className="text-sm font-semibold text-amber-600">Slow down — hourly limit reached, or solve the check again.</p>}
                <div ref={bottom} />
              </div>
              <form onSubmit={send} className="flex items-end gap-2 border-t border-black/10 p-3 dark:border-white/10">
                <textarea ref={inputRef} value={input} rows={1}
                  onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.target as HTMLTextAreaElement).form?.requestSubmit(); } }}
                  placeholder="Ask anything… (@agent #topic /command)" aria-label="Your message"
                  className="max-h-[82px] min-h-[44px] w-full resize-none overflow-hidden rounded-xl border border-black/15 bg-transparent px-3 py-2.5 text-sm dark:border-white/20" />
                {input && (
                  <button type="button" onClick={clearInput} aria-label="Clear message"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 dark:border-white/15">
                    <X size={16} />
                  </button>
                )}
                <button disabled={busy} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white disabled:opacity-60"><Send size={18} /></button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
