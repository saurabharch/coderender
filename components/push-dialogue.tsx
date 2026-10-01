"use client";

import { useState } from "react";
import { BellRing, BellOff, Check } from "lucide-react";

function urlB64ToU8(s: string): Uint8Array<ArrayBuffer> {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushDialogue() {
  const [state, setState] = useState<"idle" | "done" | "blocked" | "error">("idle");
  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;

  async function enable() {
    try {
      if (!supported) {
        setState("error");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("blocked");
        return;
      }
      const keyRes = await fetch("/api/push/key").catch(() => null);
      const { publicKey } = await keyRes?.json().catch(() => ({}));
      if (!publicKey) {
        setState("error");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToU8(publicKey),
      });
      const j = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys }),
      });
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (!supported) return null;
  if (state === "done")
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-brand-soft p-3 text-sm font-semibold dark:bg-white/10">
        <Check size={16} /> Notifications on — we'll ping you about replies and offers.
      </p>
    );
  return (
    <div className="glass rounded-2xl p-4">
      <p className="flex items-center gap-2 font-bold"><BellRing size={18} /> Get pinged, never ghosted</p>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Allow notifications and your phone will chime the moment Riya replies or a deal drops.
      </p>
      <button onClick={enable} className="beam beam-rainbow btn-dark mt-3 inline-flex min-h-[44px] items-center rounded-full px-5 text-sm font-semibold">
        Enable notifications
      </button>
      {state === "blocked" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500"><BellOff size={14} /> Blocked in browser settings — flip it there to retry.</p>
      )}
      {state === "error" && <p className="mt-2 text-xs text-red-600">Couldn't enable on this device yet.</p>}
    </div>
  );
}
