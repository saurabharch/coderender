import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = getDb().prepare("SELECT title FROM ContentBlock WHERE key=? AND published=1").get(`page:${slug}`) as
    { title: string } | undefined;
  const composed = getDb().prepare("SELECT id FROM PageBlock WHERE pageSlug=? LIMIT 1").get(slug);
  return { title: b?.title ? `${b.title} — CodeRender` : composed ? `${slug} — CodeRender` : "Page — CodeRender" };
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blocks = getDb().prepare("SELECT * FROM PageBlock WHERE pageSlug=? ORDER BY ord").all(slug) as
    { id: number; type: string; title: string; body: string }[];
  if (blocks.length > 0) {
    return (
      <div className="wrap section max-w-3xl">
        {blocks.map((b) => {
          if (b.type === "hero") return (
            <div key={b.id} className="hero-glow pb-8 pt-12 text-center">
              <h1 className="display-1 mx-auto max-w-2xl text-balance">{b.title}</h1>
              {b.body && <p className="mx-auto mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">{b.body}</p>}
            </div>
          );
          if (b.type === "features") return (
            <div key={b.id} className="mt-8 grid gap-3 sm:grid-cols-2">
              {b.body.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => (
                <div key={l} className="glass rounded-2xl p-4 text-sm font-medium">{l}</div>
              ))}
            </div>
          );
          if (b.type === "cta") return (
            <div key={b.id} className="mt-8 rounded-2xl border border-black/10 p-6 text-center dark:border-white/10">
              <p className="text-xl font-extrabold">{b.title}</p>
              {b.body && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{b.body}</p>}
              <Link href="/contact" className="beam beam-rainbow btn-dark mt-4 inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold">Book Free Demo →</Link>
            </div>
          );
          if (b.type === "faq") return (
            <div key={b.id} className="mt-8 rounded-2xl border border-black/10 p-5 dark:border-white/10">
              <p className="font-bold">{b.title}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">{b.body}</p>
            </div>
          );
          return (
            <div key={b.id} className="mt-6">
              {b.title && <h2 className="display-2">{b.title}</h2>}
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{b.body}</p>
            </div>
          );
        })}
      </div>
    );
  }
  const b = getDb().prepare("SELECT * FROM ContentBlock WHERE key=? AND published=1").get(`page:${slug}`) as
    { title: string; body: string } | undefined;
  if (!b) notFound();
  return (
    <div className="wrap section max-w-3xl">
      <h1 className="display-1">{b.title}</h1>
      <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{b.body}</div>
    </div>
  );
}
