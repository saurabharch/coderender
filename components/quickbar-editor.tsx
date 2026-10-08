"use client";

import { useState } from "react";
import { SegmentedControl, Switch, Tooltip } from "@mantine/core";
import { NoSsr } from "@/components/no-ssr";
import { QUICKBAR_ACTIONS, QUICKBAR_ROLES } from "@/lib/quickbar-catalog";

// Quick-bar matrix editor: one role at a time (segmented), one Switch per
// action with hint text + hover bubble. Saves the whole matrix in one submit.
export function QuickbarEditor({ initial, save, resetRole }: {
  initial: Record<string, string[]>;
  save: (formData: FormData) => void | Promise<unknown>;
  resetRole: (formData: FormData) => void | Promise<unknown>;
}) {
  const [role, setRole] = useState(QUICKBAR_ROLES[0]);
  const [picks, setPicks] = useState<Record<string, string[]>>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const cur = picks[role] ?? [];
  const toggle = (id: string) => {
    setPicks((p) => {
      const has = (p[role] ?? []).includes(id);
      const next = has ? (p[role] ?? []).filter((x) => x !== id) : [...(p[role] ?? []), id].slice(0, 5);
      return { ...p, [role]: next };
    });
    setMsg("");
  };

  async function onSave() {
    setSaving(true);
    try {
      const fd = new FormData();
      for (const r of QUICKBAR_ROLES) for (const id of picks[r] ?? []) fd.append(`qb_${r}`, id);
      await save(fd);
      setMsg("Saved ✓ staff bars update on next focus.");
    } catch (e) {
      // Server redirect() surfaces as a NEXT_REDIRECT throw = success + navigate.
      const digest = (e as { digest?: string })?.digest ?? "";
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return;
      setMsg("Save failed — try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onReset() {
    const fd = new FormData();
    fd.set("role", role);
    await resetRole(fd);
  }

  return (
    <div className="mt-2 grid max-w-xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
      <NoSsr fallback={
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role"
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 text-sm dark:border-white/20">
          {QUICKBAR_ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
      }>
        <SegmentedControl value={role} onChange={(v) => setRole(v as string)} aria-label="Role"
          data={QUICKBAR_ROLES.map((r) => ({ value: r, label: r }))} fullWidth
          styles={{ root: { overflowX: "auto" } }} />
      </NoSsr>
      <NoSsr fallback={
        <div className="grid gap-1">
          {QUICKBAR_ACTIONS.map((a) => {
            const on = cur.includes(a.id);
            return (
              <label key={a.id} className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-black/15 px-3 dark:border-white/20">
                <input type="checkbox" checked={on} onChange={() => toggle(a.id)} aria-label={`${a.label} for ${role}`} className="h-5 w-5" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{a.label}</span>
                  <span className="block truncate text-xs text-zinc-500">{a.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      }>
      <div className="grid gap-1">
        {QUICKBAR_ACTIONS.map((a) => {
          const on = cur.includes(a.id);
          return (
            <Tooltip key={a.id} label={a.hint} openDelay={400} position="left">
              <button onClick={() => toggle(a.id)} aria-pressed={on} title={a.hint}
                className={`flex min-h-[52px] items-center gap-3 rounded-xl border px-3 text-left ${on ? "border-brand bg-brand/10" : "border-black/15 dark:border-white/20"}`}>
                <Switch checked={on} onChange={() => toggle(a.id)} aria-label={`${a.label} for ${role}`}
                  onClick={(e) => e.stopPropagation()} color="brand" size="md" />
                <span className="min-w-0">
                  <span className="block text-sm font-bold">{a.label}</span>
                  <span className="block truncate text-xs text-zinc-500">{a.hint}</span>
                </span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-zinc-400">{a.id}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      </NoSsr>
      <p className="text-xs text-zinc-500" role="status">
        {role}: {cur.length}/5 actions{cur.length === 0 ? " (defaults apply)" : ""}
      </p>
      {msg ? <p role="status" className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{msg}</p> : null}
      <div className="flex flex-wrap gap-1.5">        <button onClick={() => void onSave()} disabled={saving}
          className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Saving…" : "Save quick bar"}</button>
        <button onClick={() => void onReset()}
          className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold capitalize dark:border-white/20">↺ {role} to defaults</button>
      </div>
    </div>
  );
}
