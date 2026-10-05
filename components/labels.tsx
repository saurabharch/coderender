"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { eanPattern } from "@/lib/barcode-core";

export function EanBars({ code, height = 56 }: { code: string; height?: number }) {
  const pattern = eanPattern(code);
  if (!pattern) return <p className="font-mono text-sm">{code}</p>;
  const bars: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < pattern.length) {
    const bit = pattern[i];
    let w = 0;
    while (i < pattern.length && pattern[i] === bit) { w++; i++; }
    if (bit === "1") bars.push(<span key={k++} style={{ width: w * 2, height }} className="inline-block bg-black" />);
    else bars.push(<span key={k++} style={{ width: w * 2, height }} className="inline-block" />);
  }
  return (
    <div>
      <div className="flex items-stretch">{bars}</div>
      <p className="mt-1 font-mono text-sm tracking-[0.2em]">{code}</p>
    </div>
  );
}

export function QrImg({ text, size = 120 }: { text: string; size?: number }) {
  const [img, setImg] = useState("");
  useEffect(() => {
    QRCode.toDataURL(text, { width: size, margin: 1 }).then(setImg).catch(() => {});
  }, [text, size]);
  if (!img) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={img} alt={`QR ${text}`} width={size} height={size} />;
}
