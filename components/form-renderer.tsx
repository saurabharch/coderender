"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { stepsFromSchema, validateValues, type FormField } from "@/lib/form-schema";
import { FieldInput, type FieldWidgetProps } from "./form-field-input";
import { SliderWidget } from "./slider-captcha";

interface PublicForm {
  title: string;
  fields: FormField[];
  schema: Record<string, unknown>;
  successMessage: string;
  redirectUrl: string;
  captcha: "off" | "default" | "slider";
}

export function FormRenderer({ slug, submitButtonText, successMessage, onSuccess, onError, fieldComponents, className }: {
  slug: string;
  submitButtonText?: string;
  successMessage?: string;
  onSuccess?: (submission: { message: string; redirectUrl?: string }) => void;
  onError?: (error: Error) => void;
  fieldComponents?: Record<string, ComponentType<FieldWidgetProps>>;
  className?: string;
}) {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState("");
  const [values, setValues] = useState<Record<string, string | number | boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [math, setMath] = useState<{ id: string; question: string } | null>(null);
  const [mathAnswer, setMathAnswer] = useState("");
  const [slider, setSlider] = useState<{ id: string; sig: string; dx: number; answers: { challenge: string; prefix: number }[] } | null>(null);

  useEffect(() => {
    fetch(`/api/forms/by-slug/${encodeURIComponent(slug)}`).then((r) => r.json()).then((d) => {
      if (d.form) {
        setForm(d.form);
        const init: Record<string, string | number | boolean> = {};
        for (const f of d.form.fields as FormField[]) {
          if (f.default !== undefined) init[f.name] = f.default;
        }
        setValues(init);
      } else {
        setLoadError("Form not found.");
      }
    }).catch(() => setLoadError("Form failed to load."));
  }, [slug]);

  const steps = useMemo(
    () => (form ? stepsFromSchema(form.schema, form.fields) : [[]] as FormField[][]),
    [form]
  );
  const current = steps[Math.min(step, steps.length - 1)] ?? [];

  if (loadError) return <p className="text-sm text-zinc-500">{loadError}</p>;
  if (!form) return <p className="text-sm text-zinc-500">Loading form…</p>;

  function set(name: string, v: string | number | boolean) {
    setValues((s) => ({ ...s, [name]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const { ok, errors: errs } = validateValues(form!.fields, values);
    setErrors(errs);
    if (!ok) return;
    if (form!.captcha === "default" && !math) {
      setErrors({ _: "Solve the quick math check first." });
      return;
    }
    if (form!.captcha === "slider" && !slider) {
      setErrors({ _: "Slide the puzzle first." });
      return;
    }
    setBusy(true);
    try {
      const gated = form!.captcha === "default"
        ? { captchaId: math!.id, captchaAnswer: Number(mathAnswer) }
        : form!.captcha === "slider"
          ? { sliderId: slider!.id, sliderSig: slider!.sig, sliderDx: slider!.dx, sliderAnswers: slider!.answers }
          : {};
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, values: { ...values, ...gated } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Submission failed");
      const msg = successMessage || data.message || form!.successMessage || "Thanks for your submission!";
      setDone(msg);
      onSuccess?.({ message: msg, redirectUrl: data.redirectUrl || form!.redirectUrl });
      if (data.redirectUrl || form!.redirectUrl) {
        window.location.href = data.redirectUrl || form!.redirectUrl;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Submission failed");
      onError?.(error);
      setErrors({ _: error.message });
    } finally {
      setBusy(false);
    }
  }

function CaptchaLoader({ onLoad }: { onLoad: (m: { id: string; question: string }) => void }) {
  useEffect(() => {
    fetch("/api/forms/captcha?kind=default").then((r) => r.json()).then((d) => {
      if (d?.id) onLoad(d);
    }).catch(() => {});
  }, [onLoad]);
  return <p className="text-sm text-zinc-500">Loading check…</p>;
}

  if (done) return <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-semibold">{done}</p>;

  return (
    <form onSubmit={submit} className={className ?? "grid gap-3"}>
      {steps.length > 1 && (
        <p className="text-xs font-semibold text-zinc-500">Step {step + 1} of {steps.length}</p>
      )}
      {current.map((f) => {
        const Custom = fieldComponents?.[f.type];
        return (
          <label key={f.name} className="grid gap-1 text-sm">{f.type === "checkbox" ? null : f.label}
            {Custom
              ? <Custom field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} error={errors[f.name]} />
              : <FieldInput field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} error={errors[f.name]} />}
          </label>
        );
      })}
      {errors._ && <p className="text-sm text-red-600">{errors._}</p>}
      {form.captcha !== "off" && step === steps.length - 1 && (
        <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Human check</p>
          {form.captcha === "slider" ? (
            slider ? (
              <p className="text-sm font-semibold text-emerald-700">✓ Puzzle solved — ready to submit.</p>
            ) : (
              <SliderWidget onSolve={setSlider} challengeUrl="/api/forms/captcha?kind=slider" />
            )
          ) : math ? (
            <span className="flex gap-2">
              <span className="flex min-h-[44px] items-center text-sm font-semibold">{math.question}</span>
              <input value={mathAnswer} onChange={(e) => setMathAnswer(e.target.value)} inputMode="numeric"
                placeholder="Answer" aria-label="Captcha answer"
                className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
              <button type="button" onClick={() => setMath(null)} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs dark:border-white/20">New</button>
            </span>
          ) : (
            <CaptchaLoader onLoad={setMath} />
          )}
        </div>
      )}
      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)}
            className="min-h-[44px] rounded-full border border-black/15 px-6 text-sm font-semibold dark:border-white/20">← Back</button>
        )}
        {step < steps.length - 1 ? (
          <button type="button" onClick={() => {
            const { ok, errors: errs } = validateValues(current, values);
            setErrors(errs);
            if (ok) setStep((s) => s + 1);
          }} className="beam beam-rainbow btn-dark min-h-[44px] rounded-full px-6 text-sm font-semibold">Next →</button>
        ) : (
          <button disabled={busy} className="beam beam-rainbow btn-dark min-h-[44px] rounded-full px-6 text-sm font-semibold disabled:opacity-60">
            {submitButtonText || "Submit →"}</button>
        )}
      </div>
    </form>
  );
}
