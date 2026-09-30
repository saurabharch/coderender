"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [detail, setDetail] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setState("error");
      setDetail(data.error === "not invited" ? "This email is not on the team list." : "Could not send. Try again.");
      return;
    }
    setState("sent");
    setDetail(data.devLink ? `Dev mode — open: ${data.devLink}` : "Check your inbox for the sign-in link.");
  }

  return (
    <div className="wrap section max-w-md">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Team</p>
      <h1 className="display-1 mt-2">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Magic link for invited team emails only.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <label className="grid gap-1 text-sm">Work email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" />
        </label>
        <button disabled={state === "sending"} className="beam beam-rainbow btn-dark min-h-[44px] rounded-full px-6 text-sm font-semibold disabled:opacity-60">
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
        {state !== "idle" && <p role="status" className="text-sm">{detail}</p>}
      </form>
    </div>
  );
}
