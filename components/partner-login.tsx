"use client";

import { useState } from "react";

export function PartnerLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [freshPin, setFreshPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/partner/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pin: pin || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Couldn't sign in.");
      if (data.pin) {
        setFreshPin(data.pin);
        return;
      }
      onDone();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid max-w-md gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="Partner email"
        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" placeholder="PIN (after first join)"
        className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
      <button disabled={busy} className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "…" : "Join / Sign in →"}</button>
      {freshPin && <p className="rounded-xl bg-brand-soft p-3 text-sm dark:bg-white/10">Your forever PIN: <b>{freshPin}</b> — save it, you sign in with email + PIN next time.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
