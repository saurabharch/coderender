"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "footer" }),
    });
    if (res.ok) setDone(true);
  }
  if (done) return <p className="mt-2 text-sm font-semibold text-brand-deep">You are in — see you Friday.</p>;
  return (
    <form onSubmit={submit} className="mt-3 flex gap-2">
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@business.com"
        aria-label="Email for newsletter"
        className="min-h-[44px] w-full rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <button className="min-h-[44px] shrink-0 rounded-xl bg-brand px-4 text-sm font-semibold text-white">Join</button>
    </form>
  );
}
