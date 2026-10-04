"use client";

import { useEffect, useState } from "react";
import type { WaProvider } from "@/lib/waha";

interface Status {
  active: WaProvider; wahaUrl: string; wahaConfigured: boolean;
  session: { status: string; me?: string };
}

export function WaProviderCard() {
  const [st, setSt] = useState<Status | null>(null);
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const d = await fetch("/api/wa/provider").then((r) => r.json()).catch(() => null);
    if (d?.active) {
      setSt(d);
      setUrl(d.wahaUrl ?? "");
    }
  }

  useEffect(() => { void load(); }, []);

  async function setProvider(provider: WaProvider) {
    const res = await fetch("/api/wa/provider", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setMsg(res.ok ? `Sender: ${provider}` : "Save failed");
    void load();
  }

  async function saveUrl() {
    await fetch("/api/wa/provider", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wahaUrl: url.trim() }),
    }).catch(() => {});
    void load();
  }

  async function session(action: "start" | "logout") {
    setMsg("");
    const res = await fetch("/api/wa/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(res.ok ? (action === "start" ? "Session start requested." : "Logged out, session data cleared.") : (data?.error ?? "WAHA unreachable"));
    setQr(null);
    void load();
  }

  async function showQR() {
    setMsg("");
    const res = await fetch("/api/wa/session").catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (data?.qr) setQr(data.qr);
    else {
      setQr(null);
      setMsg(data?.error ?? `Status: ${data?.status ?? "unknown"}`);
    }
    void load();
  }

  return (
    <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <p className="font-bold">Sender: exactly one live path</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label="WhatsApp sender">
        {(["cloud-api", "waha", "off"] as WaProvider[]).map((p) => (
          <button key={p} onClick={() => void setProvider(p)} role="radio" aria-checked={st?.active === p}
            className={`min-h-[44px] rounded-full px-4 text-sm font-semibold ${st?.active === p ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>
            {p === "cloud-api" ? "Meta Cloud API" : p === "waha" ? "WAHA" : "Off"}
          </button>
        ))}
      </div>
      {msg && <p className="mt-1 text-xs text-zinc-500">{msg}</p>}
      {st?.active === "waha" && (
        <div className="mt-3 grid gap-2 rounded-xl bg-black/5 p-3 dark:bg-white/5">
          <label className="grid gap-1 text-sm">WAHA host URL
            <span className="flex gap-1">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://host:3000" maxLength={200}
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
              <button onClick={() => void saveUrl()} className="min-h-[44px] shrink-0 rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Save</button>
            </span>
          </label>
          <p className="text-xs text-zinc-500">
            Session: <b>{st.session.status}</b>
            {st.session.me ? ` · ${st.session.me}` : ""}
            {!st.wahaConfigured ? " · host not set" : ""}
          </p>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Scan with WhatsApp" className="h-48 w-48 rounded-xl border border-black/10 bg-white p-1 dark:border-white/10" />
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => void session("start")} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Start session</button>
            <button onClick={() => void showQR()} className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Show QR</button>
            <button onClick={() => { if (confirm("Log out and clear the WAHA session?")) void session("logout"); }}
              className="min-h-[44px] rounded-xl border border-red-500/40 px-4 text-sm text-red-600">Disconnect + clear</button>
          </div>
          <p className="text-[11px] text-zinc-500">Needs a reachable WAHA host (mate your own server or VPS). Without one, every action reports unreachable — nothing is faked.</p>
        </div>
      )}
    </div>
  );
}
