"use client";

import { useEffect, useRef, useState } from "react";

interface Challenge { id: string; sig: string; bg: string; zeros: number }

// Built-in artwork (no network needed): geometric SVG scenes rendered crisp
// at canvas size. The server sends `pattern:N` when the media library is empty.
const PATTERNS = [
  (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><g fill="#ffffff" opacity="0.25">${Array.from({ length: 24 }, (_, i) => `<circle cx="${(i * 53) % w}" cy="${(i * 37) % h}" r="7"/>`).join("")}</g></svg>`,
  (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#134e4a"/><g stroke="#5eead4" stroke-width="3" opacity="0.7">${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 30 - 40}" y1="${h}" x2="${i * 30 + 40}" y2="0"/>`).join("")}</g><g fill="#fbbf24" opacity="0.9">${Array.from({ length: 8 }, (_, i) => `<rect x="${(i * 97) % w}" y="${(i * 61) % h}" width="14" height="14" transform="rotate(20 ${(i * 97) % w} ${(i * 61) % h})"/>`).join("")}</g></svg>`,
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

const W = 320;
const H = 160;
const P = 52; // piece size px

function patternFor(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 4) + 1;
}

// Jigsaw tab path centered at (cx, cy) with radius r on a P×P box.
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

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function mine(id: string, zeros: number): Promise<string> {
  for (let n = 0; n < 300000; n++) {
    const nonce = n.toString(36);
    if ((await sha256hex(`${id}:${nonce}`)).startsWith("0".repeat(zeros))) return nonce;
  }
  throw new Error("pow failed");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Slide-to-verify puzzle (devcaptcha spirit): a real piece cut from a real
// image — drag it into the hole, solve a tiny hashcash, server checks
// position + signature + TTL + single-use.
export function SliderWidget({ onPass, onSolve, challengeUrl }: {
  onPass?: () => void;
  onSolve?: (s: { id: string; sig: string; dx: number; nonce: string }) => void;
  challengeUrl?: string;
}) {
  const [ch, setCh] = useState<Challenge | null>(null);
  const [dx, setDx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bgRef = useRef<HTMLCanvasElement>(null);
  const pieceRef = useRef<HTMLCanvasElement>(null);

  // True piece offset is unknown to the client; the hole is drawn at center
  // as a visual anchor and the piece starts at the left edge.
  useEffect(() => {
    if (!ch) return;
    let live = true;
    (async () => {
      const primary = bgSrc(ch.bg, W, H);
      let img: HTMLImageElement;
      try {
        img = await loadImage(primary);
      } catch {
        // Broken/missing upload (or hotlink): fall back to built-in art tied
        // to this challenge so the puzzle always renders — never an error.
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
      // Cover-draw the background.
      const bctx = bg.getContext("2d");
      const pctx = pc.getContext("2d");
      if (!bctx || !pctx) return;
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      bctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      // Darken, then cut the anchor hole (center).
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
      // Piece shows the true image content for the same box.
      pctx.clearRect(0, 0, P, P);
      pctx.save();
      piecePath(pctx, 0, 0, P);
      pctx.clip();
      const ox = (W - dw) / 2;
      const oy = (H - dh) / 2;
      pctx.drawImage(img, (hx - ox) / scale, (hy - oy) / scale, P / scale, P / scale, 0, 0, P, P);
      pctx.restore();
      pctx.strokeStyle = "rgba(255,255,255,0.95)";
      pctx.lineWidth = 2;
      piecePath(pctx, 1, 1, P - 2);
      pctx.stroke();
    })();
    return () => { live = false; };
  }, [ch]);

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
          className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Verify you are human →</button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    );
  }

  const px = Math.round(dx * (W - P));

  return (
    <span className="grid gap-2">
      <span className="relative overflow-hidden rounded-xl border border-black/15 dark:border-white/20" style={{ width: W, maxWidth: "100%" }}>
        <canvas ref={bgRef} width={W} height={H} className="block w-full" aria-label="Puzzle background with a missing piece" />
        <canvas ref={pieceRef} width={P} height={P}
          className="absolute top-0 rounded-md shadow-lg"
          style={{ left: px, top: (H - P) / 2 }} aria-hidden />
      </span>
      <input type="range" min={0} max={1000} value={Math.round(dx * 1000)} aria-label="Slide the piece into the hole"
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
          {busy ? "Checking…" : "It's in place →"}</button>
        <button type="button" onClick={() => void load()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">New puzzle</button>
      </span>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
