import Link from "next/link";
import { RichText } from "./rich-blocks";
import { parseItems, resolveVars, type LayerProps } from "@/lib/uibuilder";

export interface Layer {
  id: number;
  type: string;
  title: string;
  body: string;
  props?: string;
}

// Server-side renderer for composed pages (SEO-friendly, no client JS).
export function ServerLayerRenderer({ layers, vars }: {
  layers: Layer[]; vars?: Record<string, string>;
}) {
  return (
    <>
      {layers.map((b) => {
        let props: LayerProps = {};
        try { props = { ...JSON.parse(b.props || "{}"), title: b.title, body: b.body }; } catch {
          props = { title: b.title, body: b.body };
        }
        const title = resolveVars(props.title ?? b.title, vars);
        const body = resolveVars(props.body ?? b.body, vars);
        if (b.type === "hero") return (
          <div key={b.id} className="hero-glow pb-8 pt-12 text-center">
            <h1 className="display-1 mx-auto max-w-2xl text-balance">{title}</h1>
            {body && <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">{body}</p>}
          </div>
        );
        if (b.type === "features") return (
          <div key={b.id} className="mt-8 grid gap-3 sm:grid-cols-2">
            {body.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => (
              <div key={l} className="glass rounded-2xl p-4 text-sm font-medium">{l}</div>
            ))}
          </div>
        );
        if (b.type === "cards") return (
          <div key={b.id} className="mt-8">
            {title && <h2 className="display-2">{title}</h2>}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {(props.items ?? parseItems(body) ?? []).map((c) => {
                const inner = (
                  <>
                    <p className="font-bold">{c.label}</p>
                    {c.value && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{c.value}</p>}
                  </>
                );
                return c.href ? (
                  <Link key={c.label} href={c.href} className="glass rounded-2xl p-4">{inner}</Link>
                ) : (
                  <div key={c.label} className="glass rounded-2xl p-4">{inner}</div>
                );
              })}
            </div>
          </div>
        );
        if (b.type === "image") return (
          <div key={b.id} className="mt-8">
            {props.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resolveVars(props.image, vars)} alt={title} className="w-full rounded-2xl object-cover" loading="lazy" />
            ) : null}
            {title && <p className="mt-2 text-center text-sm text-zinc-500">{title}</p>}
          </div>
        );
        if (b.type === "markdown") return (
          <div key={b.id} className="mt-6 text-[15px] leading-relaxed"><RichText text={body} /></div>
        );
        if (b.type === "stats") return (
          <div key={b.id} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(props.items ?? parseItems(body) ?? []).map((s) => (
              <div key={s.label} className="glass rounded-2xl p-4 text-center">
                <p className="text-2xl font-extrabold">{s.value || s.label}</p>
                {s.value && <p className="mt-1 text-xs text-zinc-500">{s.label}</p>}
              </div>
            ))}
          </div>
        );
        if (b.type === "cta") return (
          <div key={b.id} className="mt-8 rounded-2xl border border-black/10 p-6 text-center dark:border-white/10">
            <p className="text-xl font-extrabold">{title}</p>
            {body && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>}
            <Link href={props.link || "/contact"} className="beam beam-rainbow btn-dark mt-4 inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold">Book Free Demo →</Link>
          </div>
        );
        if (b.type === "faq") return (
          <div key={b.id} className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
            {title && <p className="font-bold">{title}</p>}
            <div className="mt-2 space-y-2">
              {(props.items ?? parseItems(body) ?? []).map((f) => (
                <details key={f.label} className="rounded-xl bg-black/5 p-3 text-sm dark:bg-white/10">
                  <summary className="min-h-[44px] cursor-pointer font-semibold">{f.label}</summary>
                  <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">{f.value || ""}</p>
                </details>
              ))}
            </div>
          </div>
        );
        if (b.type === "divider") return <hr key={b.id} className="mt-8 border-black/10 dark:border-white/10" />;
        if (b.type === "spacer") return <div key={b.id} className="mt-8" />;
        return (
          <div key={b.id} className="mt-6">
            {title && <h2 className="display-2">{title}</h2>}
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{body}</p>
          </div>
        );
      })}
    </>
  );
}
