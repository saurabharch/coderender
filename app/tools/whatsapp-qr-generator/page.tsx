"use client";

import { useState } from "react";
import QRCode from "qrcode";

export default function QrGeneratorPage() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Hi! I found you on Google.");
  const [img, setImg] = useState("");

  const link = phone.replace(/\D/g, "")
    ? `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
    : "";

  async function make() {
    if (!link) return;
    setImg(await QRCode.toDataURL(link, { width: 320, margin: 2 }));
  }

  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Free tool</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">WhatsApp QR Generator</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">Type a number + message, get a scannable QR and a click-to-chat link. Runs 100% in your browser.</p>
      <div className="mt-6 grid gap-3">
        <label className="grid gap-1 text-sm">WhatsApp number (with country code)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="919831778894" inputMode="tel" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
        </label>
        <label className="grid gap-1 text-sm">Prefilled message
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
        </label>
        <button onClick={make} disabled={!link} className="min-h-[44px] rounded-xl bg-brand font-semibold text-white disabled:opacity-50">Generate QR</button>
        {link && <p className="break-all text-sm">Link: <a className="underline" href={link}>{link}</a></p>}
        {/* eslint-disable-next-line @next/next/no-img-element -- data-URL QR output, nothing to optimize */}
        {img && <img src={img} alt="WhatsApp chat QR code" width={240} height={240} className="rounded-2xl border border-black/10 dark:border-white/10" />}
      </div>
    </div>
  );
}
