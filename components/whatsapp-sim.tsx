"use client";

import { useEffect, useReducer } from "react";
import { useReducedMotion } from "framer-motion";
import { Check, CheckCheck } from "lucide-react";

interface Msg {
  from: "customer" | "business";
  text: string;
}

const SCRIPT: Msg[] = [
  { from: "customer", text: "Hi! Do you have slots this Saturday?" },
  { from: "business", text: "Hi Asha! Yes — 11 AM and 4 PM are open. Which works for you?" },
  { from: "customer", text: "4 PM please. And price for bridal package?" },
  { from: "business", text: "Done — 4 PM Saturday is yours ✅ Bridal is ₹8,999 all-inclusive." },
];

type Tick = "sent" | "delivered" | "read";

interface State {
  shown: number;
  typing: boolean;
  ticks: Record<number, Tick>;
}

const RESET: State = { shown: 0, typing: false, ticks: {} };

function Ticks({ state }: { state: Tick }) {
  if (state === "sent") return <Check size={13} className="text-zinc-400" />;
  if (state === "delivered") return <CheckCheck size={13} className="text-zinc-400" />;
  return <CheckCheck size={13} className="text-sky-500" />;
}

export function WhatsAppSim() {
  const reduce = useReducedMotion();
  const [state, setState] = useReducer(
    (_s: State, a: Partial<State>): State => ({ ..._s, ...a }),
    RESET
  );

  useEffect(() => {
    if (reduce) {
      setState({ shown: SCRIPT.length, typing: false, ticks: Object.fromEntries(SCRIPT.map((_, i) => [i, "read" as Tick])) });
      return;
    }
    let alive = true;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    (async () => {
      while (alive) {
        const ticks: Record<number, Tick> = {};
        setState({ shown: 0, typing: false, ticks: {} });
        await wait(600);
        if (!alive) return;
        for (let i = 0; i < SCRIPT.length; i++) {
          const m = SCRIPT[i];
          if (m.from === "customer") {
            setState({ shown: i + 1, typing: false, ticks: { ...ticks } });
            await wait(1400);
          } else {
            setState({ typing: true });
            await wait(1100);
            if (!alive) return;
            ticks[i] = "sent";
            setState({ shown: i + 1, typing: false, ticks: { ...ticks } });
            await wait(500);
            if (!alive) return;
            ticks[i] = "delivered";
            setState({ ticks: { ...ticks } });
            await wait(700);
            if (!alive) return;
            ticks[i] = "read";
            setState({ ticks: { ...ticks } });
            await wait(1200);
          }
          if (!alive) return;
        }
        await wait(3500);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reduce]);

  return (
    <div className="rounded-2xl bg-[#e7ffdb] p-2.5" aria-live="polite" aria-label="WhatsApp automation simulation">
      <div className="space-y-1.5">
        {SCRIPT.slice(0, state.shown).map((m, i) =>
          m.from === "customer" ? (
            <p key={i} className="sim-in ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-sm bg-white px-2.5 py-1.5 text-[11px] shadow-sm">{m.text}</p>
          ) : (
            <div key={i} className="sim-in w-fit max-w-[90%] rounded-2xl rounded-bl-sm bg-[#d9fdd3] px-2.5 py-1.5 shadow-sm">
              <p className="text-[11px]">{m.text}</p>
              <p className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-zinc-500">
                {new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} <Ticks state={state.ticks[i] ?? "sent"} />
              </p>
            </div>
          )
        )}
        {state.typing && (
          <p className="flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm bg-[#d9fdd3] px-3 py-2 shadow-sm" aria-label="Business is typing">
            {[0, 1, 2].map((d) => (
              <span key={d} style={{ animationDelay: `${d * 180}ms` }} className="typing-dot h-1.5 w-1.5 rounded-full bg-zinc-500" />
            ))}
          </p>
        )}
      </div>
      <style>{`
        @keyframes simIn { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
        .sim-in { animation: simIn .35s ease-out both; }
        @keyframes blink { 0%, 60%, 100% { opacity: .25; } 30% { opacity: 1; } }
        .typing-dot { animation: blink 1s infinite; }
        @media (prefers-reduced-motion: reduce) { .sim-in, .typing-dot { animation: none; } }
      `}</style>
    </div>
  );
}
