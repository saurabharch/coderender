"use client";

import { useState } from "react";
import { VERTICALS } from "@/lib/site";

export function LeadForm({ source = "contact" }: { source?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      businessType: String(form.get("businessType") ?? "general"),
      source,
      message: String(form.get("message") ?? ""),
    };
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) setState("done");
    else {
      setState("error");
      setError("Could not submit. Please try WhatsApp instead.");
    }
  }

  if (state === "done")
    return <p role="status" className="rounded-xl bg-brand-soft p-4 font-medium">Thanks — we will reply within one business day.</p>;

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        Name
        <input name="name" required minLength={2} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
      </label>
      <label className="grid gap-1 text-sm">
        Phone / WhatsApp
        <input name="phone" required minLength={7} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
      </label>
      <label className="grid gap-1 text-sm">
        Business type
        <select name="businessType" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20">
          <option value="general">General</option>
          {VERTICALS.map((v) => (
            <option key={v.slug} value={v.slug}>{v.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        Message
        <textarea name="message" rows={4} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/20" />
      </label>
      {state === "error" && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="min-h-[44px] rounded-xl bg-brand font-semibold text-white disabled:opacity-60">
        {state === "sending" ? "Sending…" : "Request a callback"}
      </button>
    </form>
  );
}
