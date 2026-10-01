"use client";

import { useState } from "react";

interface Challenge { id: string; sig: string; bg: string; zeros: number }

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function mine(id: string, zeros: number): Promise<string> {
  for (let n = 0; n < 200000; n++) {
    const nonce = n.toString(36);
    if ((await sha256hex(`${id}:${nonce}`)).startsWith("0".repeat(zeros))) return nonce;
  }
  throw new Error("pow failed");
}

// Slide-to-verify puzzle (devcaptcha spirit): drag the piece, solve a tiny
// hashcash, server checks position + signature + TTL + single-use.
// With onSolve the solution is handed back (forms verify at submit);
// otherwise it verifies immediately and sets the human cookie (chat).
export function SliderWidget({ onPass, onSolve, challengeUrl }: {
  onPass?: () => void;
  onSolve?: (s: { id: string; sig: string; dx: number; nonce: string }) => void;
  challengeUrl?: string;
}) {
  const [ch, setCh] = useState<Challenge | null>(null);
  const [dx, setDx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setDx(0);
    const res = await fetch(challengeUrl ?? "/api/slider-captcha").catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (data?.id) setCh(data);
    else setError("Puzzle failed to load — retry.");
  }

  if (!ch) {
    return (
      <span className="grid gap-2">
        <button type="button" onClick={() => void load()}
          className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Verify you're human →</button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  const pct = Math.round(dx * 100);
  const bg = ch.bg.startsWith("gradient:")
    ? `linear-gradient(135deg, hsl(${140 + (Number(ch.bg.split(":")[1]) || 1) * 37}, 70%, 45%), hsl(${(Number(ch.bg.split(":")[1]) || 1) * 53}, 75%, 30%))`
    : undefined;

  return (
    <span className="grid gap-2">
      <span className="relative h-28 overflow-hidden rounded-xl border border-black/15 dark:border-white/20">
        {bg ? (
          <span className="absolute inset-0" style={{ background: bg }} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ch.bg} alt="puzzle background" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        )}
        <span className="absolute top-1/2 h-12 w-12 -translate-y-1/2 rounded-lg border-2 border-white/90 bg-white/25 shadow"
          style={{ left: `calc(${pct}% - ${Math.round(dx * 48)}px)` }} />
      </span>
      <input type="range" min={0} max={1000} value={Math.round(dx * 1000)} aria-label="Slide the piece into place"
        onChange={(e) => setDx(Number(e.target.value) / 1000)}
        className="h-11 w-full accent-brand" />
      <span className="flex gap-2">
        <button type="button" disabled={busy} onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const nonce = await mine(ch.id, ch.zeros);
            const dxn = Math.round(dx * 1000) / 1000;
            if (onSolve) {
              onSolve({ id: ch.id, sig: ch.sig, dx: dxn, nonce });
              return;
            }
            const res = await fetch("/api/slider-captcha", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: ch.id, sig: ch.sig, dx: dxn, nonce }),
            });
            if (!res.ok) throw new Error(await res.json().then((d) => d.error).catch(() => "verify failed"));
            onPass?.();
          } catch {
            setError("Not quite — try again.");
            void load();
          } finally {
            setBusy(false);
          }
        }} className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Checking…" : "I'm human →"}</button>
        <button type="button" onClick={() => void load()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">New puzzle</button>
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
