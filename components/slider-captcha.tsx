"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./logo";

interface Challenge {
  id: string; sig: string; bg: string;
  challenges: string[]; zeros: number;
}

export interface SliderSolution {
  id: string; sig: string; dx: number;
  answers: { challenge: string; prefix: number }[];
}

// Built-in artwork fallback (offline-safe geometric scenes).
const PATTERNS = [
  (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><g fill="#ffffff" opacity="0.25">${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 53) % w}" cy="${(i * 37) % h}" r="7"/>`).join("")}</g></svg>`,
  (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#134e4a"/><g stroke="#5eead4" stroke-width="3" opacity="0.7">${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 30 - 40}" y1="${h}" x2="${i * 30 + 40}" y2="0"/>`).join("")}</g></svg>`,
  (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#7c2d12"/><g fill="none" stroke="#fdba74" stroke-width="4" opacity="0.8">${Array.from({ length: 6 }, (_, i) => `<path d="M0 ${20 + i * 24} Q 75 ${i * 24}, 150 ${20 + i * 24} T 300 ${20 + i * 24}"/>`).join("")}</g></svg>`,
  (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#1e1b4b"/><g opacity="0.85">${Array.from({ length: 30 }, (_, i) => `<polygon points="${(i * 47) % w},${(i * 29) % h} ${((i * 47) % w) + 18},${(i * 29) % h} ${((i * 47) % w) + 9},${((i * 29) % h) + 15}" fill="${i % 2 ? "#f472b6" : "#a78bfa"}"/>`).join("")}</g></svg>`,
];

function bgSrc(bg: string, w: number, h: number): string {
  const m = /^pattern:(\d+)$/.exec(bg);
  if (m) {
    const fn = PATTERNS[(Number(m[1]) - 1 + PATTERNS.length) % PATTERNS.length];
    return `data:image/svg+xml,${encodeURIComponent(fn(w, h))}`;
  }
  return bg;
}

function patternFor(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 4) + 1;
}

const W = 320;
const H = 160;
const P = 52; // piece size px

// Jigsaw tab path in a P×P box at (x, y).
function piecePath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const r = s * 0.22;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s / 2 - r / 2, y);
  ctx.arc(x + s / 2, y, r / 2, Math.PI, 0);
  ctx.lineTo(x + s, y);
  ctx.lineTo(x + s, y + s);
  ctx.lineTo(x, y + s);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Mine with the public worker (progress callbacks) or inline as fallback.
function mine(
  challenges: string[], zeros: number,
  onProgress: (solved: number, total: number) => void
): Promise<{ challenge: string; prefix: number }[]> {
  return new Promise((resolve, reject) => {
    void (async () => {
      let worker: Worker | null = null;
      try {
        worker = new Worker("/captcha-worker.js");
        if (!worker) throw new Error("no worker");
        worker.onmessage = (event: MessageEvent) => {
          if (event.data?.type === "next") onProgress(event.data.solved, event.data.total);
          else if (event.data?.type === "success") {
            worker?.terminate();
            resolve(event.data.arr);
          }
        };
        worker.onerror = () => {
          worker?.terminate();
          reject(new Error("worker failed"));
        };
        worker.postMessage({ challenges, leadingZerosLength: zeros });
      } catch {
        // Inline fallback (no Worker support): same protocol, main thread.
        try {
          const out: { challenge: string; prefix: number }[] = [];
          for (const challenge of challenges) {
            let prefix = 0;
            for (;;) {
              const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(prefix + challenge));
              const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
              if (hex.startsWith("0".repeat(zeros))) break;
              prefix++;
            }
            out.push({ challenge, prefix });
            onProgress(out.length, challenges.length);
          }
          resolve(out);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("mine failed"));
        }
      }
    })();
  });
}

type Stage = "idle" | "ready" | "solving" | "locked";

// Slide-to-verify puzzle (devcaptcha flow, native art): prompt bar, canvas
// with a real cut-out piece, worker-mined proof with progress, lock states,
// and a powered-by footer. With onSolve the solution is handed back (forms
// verify at submit); otherwise it verifies immediately (chat cookie flow).
export function SliderWidget({ onPass, onSolve, challengeUrl }: {
  onPass?: () => void;
  onSolve?: (s: SliderSolution) => void;
  challengeUrl?: string;
}) {
  const [ch, setCh] = useState<Challenge | null>(null);
  const [dx, setDx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const bgRef = useRef<HTMLCanvasElement>(null);
  const pieceRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ch) return;
    let live = true;
    (async () => {
      const primary = bgSrc(ch.bg, W, H);
      let img: HTMLImageElement;
      try {
        img = await loadImage(primary);
      } catch {
        try {
          img = await loadImage(bgSrc(`pattern:${patternFor(ch.id)}`, W, H));
        } catch {
          if (live) setError("Puzzle failed to load — retry.");
          return;
        }
      }
      if (!live) return;
      const bg = bgRef.current;
      const pc = pieceRef.current;
      if (!bg || !pc) return;
      const bctx = bg.getContext("2d");
      const pctx = pc.getContext("2d");
      if (!bctx || !pctx) return;
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const ox = (W - dw) / 2;
      const oy = (H - dh) / 2;
      bctx.drawImage(img, ox, oy, dw, dh);
      bctx.fillStyle = "rgba(0,0,0,0.45)";
      bctx.fillRect(0, 0, W, H);
      const hx = W / 2 - P / 2;
      const hy = H / 2 - P / 2;
      bctx.save();
      piecePath(bctx, hx, hy, P);
      bctx.clip();
      bctx.clearRect(hx - P, hy - P, P * 3, P * 3);
      bctx.restore();
      bctx.strokeStyle = "rgba(255,255,255,0.9)";
      bctx.lineWidth = 2;
      piecePath(bctx, hx, hy, P);
      bctx.stroke();
      pctx.clearRect(0, 0, P, P);
      pctx.save();
      piecePath(pctx, 0, 0, P);
      pctx.clip();
      pctx.drawImage(img, (hx - ox) / scale, (hy - oy) / scale, P / scale, P / scale, 0, 0, P, P);
      pctx.restore();
      pctx.strokeStyle = "rgba(255,255,255,0.95)";
      pctx.lineWidth = 2;
      piecePath(pctx, 1, 1, P - 2);
      pctx.stroke();
      if (live) setStage("ready");
    })();
    return () => { live = false; };
  }, [ch]);

  async function load() {
    setError("");
    setDx(0);
    setStage("idle");
    setProgress(0);
    const res = await fetch(challengeUrl ?? "/api/slider-captcha").catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (data?.id) setCh(data);
    else setError("Puzzle failed to load — retry.");
  }

  async function submit() {
    if (!ch || busy) return;
    setBusy(true);
    setError("");
    setStage("solving");
    try {
      const answers = await mine(ch.challenges, ch.zeros, (s, t) => setProgress(Math.round((s / t) * 100)));
      setStage("locked");
      const dxn = Math.round(dx * 1000) / 1000;
      if (onSolve) {
        onSolve({ id: ch.id, sig: ch.sig, dx: dxn, answers });
        return;
      }
      const res = await fetch("/api/slider-captcha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ch.id, sig: ch.sig, dx: dxn, answers }),
      });
      if (!res.ok) throw new Error(await res.json().then((d) => d.error).catch(() => "verify failed"));
      onPass?.();
    } catch {
      setError("Not quite — try again.");
      void load();
    } finally {
      setBusy(false);
      setStage("ready");
    }
  }

  if (!ch) {
    return (
      <span className="grid gap-2">
        <button type="button" onClick={() => void load()}
          className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Verify you are human →</button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  const px = Math.round(dx * (W - P));

  return (
    <span className="grid gap-1.5">
      <span className="rounded-t-xl bg-white px-2 py-1.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
        Move the piece into the hole to solve captcha
      </span>
      <span className="relative overflow-hidden border-x border-black/15 dark:border-white/20" style={{ width: W, maxWidth: "100%" }}>
        <canvas ref={bgRef} width={W} height={H} className="block w-full" aria-label="Puzzle background with a missing piece" />
        <canvas ref={pieceRef} width={P} height={P}
          className="absolute rounded-md shadow-lg"
          style={{ left: px, top: (H - P) / 2 }} aria-hidden />
        {(stage === "solving" || stage === "locked") && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            <span className="text-xs font-bold text-white">{stage === "solving" ? `Solving… ${progress}%` : "Locked ✓"}</span>
          </span>
        )}
      </span>
      <input type="range" min={0} max={1000} value={Math.round(dx * 1000)} aria-label="Slide the piece into the hole"
        onChange={(e) => setDx(Number(e.target.value) / 1000)}
        className="h-11 w-full accent-brand" />
      <span className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void submit()}
          className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? "Checking…" : "It's in place →"}</button>
        <button type="button" onClick={() => void load()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">New puzzle</button>
      </span>
      <span className="flex items-center justify-between rounded-b-xl bg-white px-2 py-1 dark:bg-zinc-900">
        <span className="flex gap-2 text-[11px] text-zinc-500">
          <a href="/privacy" className="underline">Privacy</a>
          <a href="/terms" className="underline">Terms</a>
        </span>
        <span className="flex items-center gap-1 text-zinc-500 [&>span>span:last-child]:text-[11px]">
          <span className="text-[11px] font-semibold">powered by</span><Logo size={14} wordmark="full" />
        </span>
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
