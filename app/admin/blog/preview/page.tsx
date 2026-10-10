import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { CommentThread } from "@/components/comment-thread";

// Author-only preview: renders the exact public template for drafts and
// un-published posts. Team-gated; never indexed (no metadata export).
export default async function BlogPreview({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireTeam();
  const sp = await searchParams;
  try { getDb().exec("ALTER TABLE Post ADD COLUMN author TEXT NOT NULL DEFAULT ''"); } catch { /* exists */ }
  const post = getDb().prepare("SELECT * FROM Post WHERE id=?").get(Number(sp.id || 0)) as
    { id: number; slug: string; title: string; body: string; cover: string; published: number; createdAt: string; author: string } | undefined;
  if (!post) notFound();
  return (
    <div className="wrap section max-w-3xl">
      <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-300">
        Preview #{post.id} — {post.published ? "live" : "draft, not public"}{post.author ? ` · by ${post.author}` : ""} · <Link href="/admin/blog" className="underline">back to CMS</Link></p>
      <div className="mt-4">
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover} alt="" className="mb-4 aspect-[21/9] w-full rounded-2xl object-cover" />
        ) : null}
        <h1 className="display-1">{post.title}</h1>
        <p className="mt-2 text-xs text-zinc-500">{post.createdAt.slice(0, 10)}</p>
        <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{post.body}</div>
        <h2 id="comments" className="mt-10 font-bold">Comments</h2>
        <div className="mt-3">
          <CommentThread resourceType="blog-post" resourceId={post.slug} />
        </div>
      </div>
    </div>
  );
}
