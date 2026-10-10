import { notFound } from "next/navigation";
import { getDb } from "@/lib/store";
import { cleanBody, isHtmlBody } from "@/lib/body-html";
import { CommentThread } from "@/components/comment-thread";

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
    { id: number; title: string; body: string; cover: string; createdAt: string } | undefined;
  if (!post) notFound();
  try {
    const day = new Date().toISOString().slice(0, 10);
    getDb().prepare("INSERT INTO PostView (postId, day, views) VALUES (?,?,1) ON CONFLICT(postId, day) DO UPDATE SET views=views+1")
      .run(post.id, day);
  } catch { /* analytics never break reads */ }
  return (
    <div className="wrap section max-w-3xl">
      {post.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.cover} alt="" className="mb-4 aspect-[21/9] w-full rounded-2xl object-cover" />
      ) : null}
      <h1 className="display-1">{post.title}</h1>
      <p className="mt-2 text-xs text-zinc-500">{post.createdAt.slice(0, 10)}</p>
      {isHtmlBody(post.body) ? (
        <div className="blog-body mt-4 text-[15px] leading-relaxed" dangerouslySetInnerHTML={{ __html: cleanBody(post.body) }} />
      ) : (
        <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{post.body}</div>
      )}
      <h2 id="comments" className="mt-10 font-bold">Comments</h2>
      <div className="mt-3">
        <CommentThread resourceType="blog-post" resourceId={slug} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">Posts as JSON too: <code>POST /api/comments {"{resourceType: 'blog-post', resourceId, name, body}"}</code></p>
    </div>
  );
}
