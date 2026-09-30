import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getDb().prepare("SELECT title, excerpt FROM Post WHERE slug=? AND published=1").get(slug) as
    { title: string; excerpt: string } | undefined;
  return { title: p ? `${p.title} — CodeRender Blog` : "Blog — CodeRender", description: p?.excerpt };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getDb().prepare("SELECT * FROM Post WHERE slug=? AND published=1").get(slug) as
    { title: string; body: string; createdAt: string } | undefined;
  if (!post) notFound();
  const comments = getDb().prepare("SELECT name, body, createdAt FROM Comment WHERE postId=(SELECT id FROM Post WHERE slug=?) AND status='approved' ORDER BY id").all(slug) as
    { name: string; body: string; createdAt: string }[];
  return (
    <div className="wrap section max-w-3xl">
      <h1 className="display-1">{post.title}</h1>
      <p className="mt-2 text-xs text-zinc-500">{post.createdAt.slice(0, 10)}</p>
      <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{post.body}</div>
      <h2 className="mt-10 font-bold">Comments ({comments.length})</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {comments.map((c, i) => (
          <li key={i} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <b>{c.name}</b> <span className="text-xs text-zinc-500">{c.createdAt.slice(0, 10)}</span>
            <p className="mt-1">{c.body}</p>
          </li>
        ))}
      </ul>
      <form action="/api/comments" method="post" className="mt-4 grid max-w-md gap-2">
        <input type="hidden" name="slug" value={slug} />
        <input name="name" required placeholder="Your name" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <textarea name="body" required rows={3} placeholder="Your comment (held for moderation)" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <button formAction="/api/comments" className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Post comment</button>
      </form>
      <p className="mt-2 text-xs text-zinc-500">Posts as JSON too: <code>POST /api/comments {"{slug, name, body}"}</code></p>
    </div>
  );
}
