import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/store";

export const metadata: Metadata = { title: "Blog — CodeRender", description: "Growth notes for local businesses." };

export default async function BlogIndex() {
  const posts = getDb().prepare("SELECT slug, title, excerpt, cover, createdAt FROM Post WHERE published=1 ORDER BY id DESC").all() as
    { slug: string; title: string; excerpt: string; cover: string; createdAt: string }[];
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Resources</p>
      <h1 className="display-1 mt-2">Blog</h1>
      <div className="mt-6 grid gap-4">
        {posts.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="glass overflow-hidden rounded-2xl">
            {p.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover} alt="" className="aspect-[21/9] w-full object-cover" loading="lazy" />
            ) : null}
            <span className="block p-5">
              <p className="font-bold">{p.title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{p.excerpt}</p>
              <p className="mt-1 text-xs text-zinc-500">{p.createdAt.slice(0, 10)}</p>
            </span>
          </Link>
        ))}
        {posts.length === 0 && <p className="text-sm text-zinc-500">No posts yet — the first one ships from /admin/blog.</p>}
      </div>
    </div>
  );
}
