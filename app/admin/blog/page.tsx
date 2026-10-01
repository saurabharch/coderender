import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { CoverField } from "@/components/media-picker";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `post-${Date.now()}`;

async function save(form: FormData) {
  "use server";
  await requireTeam();
  const id = Number(form.get("id") || 0);
  const title = String(form.get("title") || "").slice(0, 160);
  if (!title) return;
  const slug = String(form.get("slug") || slugify(title));
  const excerpt = String(form.get("excerpt") || "").slice(0, 300);
  const body = String(form.get("body") || "").slice(0, 20000);
  const published = form.get("published") ? 1 : 0;
  const cover = String(form.get("cover") || "").slice(0, 500);
  if (id) getDb().prepare("UPDATE Post SET slug=?, title=?, excerpt=?, body=?, published=?, cover=? WHERE id=?").run(slug, title, excerpt, body, published, cover, id);
  else getDb().prepare("INSERT INTO Post (slug, title, excerpt, body, published, cover) VALUES (?,?,?,?,?,?)").run(slug, title, excerpt, body, published, cover);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

async function remove(form: FormData) {
  "use server";
  await requireTeam();
  const id = Number(form.get("id"));
  getDb().prepare("DELETE FROM Comment WHERE postId=?").run(id);
  getDb().prepare("DELETE FROM Post WHERE id=?").run(id);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

async function moderate(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("UPDATE Comment SET status=? WHERE id=?").run(String(form.get("status")), Number(form.get("id")));
  revalidatePath("/admin/blog");
}

export default async function BlogAdmin() {
  const posts = getDb().prepare("SELECT * FROM Post ORDER BY id DESC LIMIT 100").all() as
    { id: number; slug: string; title: string; excerpt: string; body: string; published: number }[];
  const pending = getDb().prepare(
    "SELECT c.id, c.name, c.body, p.title FROM Comment c JOIN Post p ON p.id=c.postId WHERE c.status='pending' ORDER BY c.id DESC LIMIT 50").all() as
    { id: number; name: string; body: string; title: string }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Blog CMS</h1>
      <form action={save} className="mt-4 grid max-w-2xl gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <input type="hidden" name="id" value="" />
        <div className="grid gap-2 md:grid-cols-2">
          <input name="title" required placeholder="Title" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input name="slug" placeholder="slug (auto)" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        </div>
        <input name="excerpt" placeholder="Excerpt" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <textarea name="body" rows={6} placeholder="Body (plain text, paragraphs kept)" className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <CoverField name="cover" />
        <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" name="published" value="1" defaultChecked className="h-5 w-5" /> Published</label>
        <button className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Save post</button>
      </form>
      <h2 className="mt-6 font-bold">Posts ({posts.length})</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {posts.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 p-2 dark:border-white/10">
            <span><a className="underline" href={`/blog/${p.slug}`}>{p.title}</a> · {p.published ? "live" : "draft"}</span>
            <form action={remove}><input type="hidden" name="id" value={p.id} />
              <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Delete</button></form>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-bold">Comments awaiting moderation ({pending.length})</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {pending.map((c) => (
          <li key={c.id} className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
            <p><b>{c.name}</b> on {c.title}</p><p className="mt-1">{c.body}</p>
            <div className="mt-2 flex gap-2">
              {(["approved", "rejected"] as const).map((s) => (
                <form key={s} action={moderate}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value={s} />
                  <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">{s}</button></form>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
