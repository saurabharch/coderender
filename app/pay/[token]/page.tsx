"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function PayToken({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<{ amount: number; upi: string } | null>(null);
  const [qr, setQr] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    params.then((p) => {
      setToken(p.token);
      fetch(`/api/pay/link?token=${encodeURIComponent(p.token)}`).then((r) => r.json()).then(async (d) => {
        if (d.ok) {
          setInfo(d);
          if (d.upi) setQr(await QRCode.toDataURL(d.upi, { width: 280, margin: 2 }));
        } else setErr(d.error ?? "invalid link");
      }).catch(() => setErr("failed to load"));
    });
  }, [params]);

  return (
    <div className="wrap section max-w-md text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Pay securely</p>
      {err && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{err}</p>}
      {info && (
        <>
          <p className="display-1 mt-2">₹{(info.amount / 100).toFixed(0)}</p>
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="UPI QR — scan to pay" className="mx-auto mt-4 h-64 w-64 rounded-2xl border border-black/10" />
          ) : (
            <p className="mt-4 text-sm text-zinc-500">UPI QR not configured — pay cash/UPI to the merchant directly and share the screenshot on WhatsApp.</p>
          )}
          <p className="mt-3 text-sm text-zinc-500">Pay, then tap done — the team confirms on their dashboard.</p>
          <p className="mt-1 font-mono text-xs text-zinc-400">{token}</p>
        </>
      )}
    </div>
  );
}
