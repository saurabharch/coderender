import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Eye, Heart, MessageCircle } from "lucide-react";
import { getDb } from "@/lib/store";
import { plainExcerpt, readMinutes } from "@/lib/body-html";

export const metadata: Metadata = { title: "Blog — CodeRender", description: "Growth notes for local businesses." };

// Publishing must show immediately: never serve a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function BlogIndex() {
  try { getDb().exec("ALTER TABLE Post ADD COLUMN author TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
  const posts = getDb().prepare(
    "SELECT id, slug, title, excerpt, body, cover, author, createdAt FROM Post WHERE published=1 ORDER BY id DESC").all() as
    { id: number; slug: string; title: string; excerpt: string; body: string; cover: string; author: string; createdAt: string }[];
  const counts = Object.fromEntries(getDb().prepare(
    "SELECT postId, COUNT(*) n FROM Comment WHERE status='approved' GROUP BY postId").all()
    .map((r) => [(r as { postId: number }).postId, (r as { n: number }).n])) as Record<number, number>;
  const likes = Object.fromEntries(getDb().prepare(
    "SELECT c.postId AS postId, COUNT(*) n FROM CommentLike l JOIN Comment c ON c.id=l.commentId WHERE c.status='approved' GROUP BY c.postId").all()
    .map((r) => [(r as { postId: number }).postId, (r as { n: number }).n])) as Record<number, number>;
  const views = Object.fromEntries(getDb().prepare(
    "SELECT postId, COALESCE(SUM(views),0) v FROM PostView GROUP BY postId").all()
    .map((r) => [(r as { postId: number }).postId, (r as { v: number }).v])) as Record<number, number>;
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Resources</p>
      <h1 className="display-1 mt-2">Blog</h1>
      <div className="mt-6 grid gap-4">
        {posts.map((p) => {
          const blurb = p.excerpt || plainExcerpt(p.body);
          return (
          <Link key={p.slug} href={`/blog/${p.slug}`} className="glass overflow-hidden rounded-2xl">
            {p.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover} alt="" className="aspect-[21/9] w-full object-cover" loading="lazy" />
            ) : null}
            <span className="block p-5">
              <p className="font-bold">{p.title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{blurb}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                {p.author ? <span className="font-semibold text-zinc-700 dark:text-zinc-300">by {p.author}</span> : null}
                <span className="flex items-center gap-1"><Clock size={13} aria-hidden /> {readMinutes(p.body)} min read</span>
                <span className="flex items-center gap-1"><Eye size={13} aria-hidden /> {views[p.id] ?? 0}</span>
                <span className="flex items-center gap-1"><Heart size={13} aria-hidden /> {likes[p.id] ?? 0}</span>
                <span className="flex items-center gap-1"><MessageCircle size={13} aria-hidden /> {counts[p.id] ?? 0}</span>
                <span>{p.createdAt.slice(0, 10)}</span>
              </p>
            </span>
          </Link>
          );
        })}
        {posts.length === 0 && <p className="text-sm text-zinc-500">No posts yet — the first one ships from /admin/blog.</p>}
      </div>
    </div>
  );
}
