import Link from "next/link";
import { revalidatePath } from "next/cache";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { deleteAsset, listAssets, listFolders } from "@/lib/media";
import { MediaGallery, MediaUploader } from "@/components/media-studio";

async function remove(form: FormData) {
  "use server";
  await requireTeam();
  const row = getDb().prepare("SELECT filename FROM MediaAsset WHERE id=?").get(Number(form.get("id"))) as
    { filename: string } | undefined;
  if (row) {
    if (row.filename) await unlink(join(process.cwd(), "public", "uploads", row.filename)).catch(() => {});
    await deleteAsset(Number(form.get("id")));
  }
  revalidatePath("/admin/media");
}

async function saveAlt(form: FormData) {
  "use server";
  await requireTeam();
  getDb().prepare("UPDATE MediaAsset SET alt=? WHERE id=?")
    .run(String(form.get("alt") || "").slice(0, 160), Number(form.get("id")));
  revalidatePath("/admin/media");
}

async function makeFolder(form: FormData) {
  "use server";
  await requireTeam();
  const name = String(form.get("name") || "").slice(0, 60).trim();
  if (name) getDb().prepare("INSERT INTO MediaFolder (name) VALUES (?)").run(name);
  revalidatePath("/admin/media");
}

async function removeFolder(form: FormData) {
  "use server";
  await requireTeam();
  const id = Number(form.get("id"));
  const kids = (getDb().prepare("SELECT COUNT(*) c FROM MediaAsset WHERE folder=(SELECT name FROM MediaFolder WHERE id=?)").get(id) as { c: number }).c;
  if (kids === 0) getDb().prepare("DELETE FROM MediaFolder WHERE id=?").run(id);
  revalidatePath("/admin/media");
}

export default async function MediaAdmin({ searchParams }: { searchParams: Promise<{ q?: string; folder?: string }> }) {
  const sp = await searchParams;
  const q = sp.q || "";
  const folder = sp.folder || "";
  const { items, total } = listAssets({ q: q || undefined, folder: folder || undefined, limit: 60 });
  const folders = listFolders();
  return (
    <>
      <h1 className="text-2xl font-extrabold">Media library</h1>
      <p className="mt-1 text-sm text-zinc-500">{total} assets · uploads land in <code>/uploads/</code> · copy a URL into any image field, kanban card, or post cover. Images filed under the <code>puzzle</code> folder (and only those) feed the slide-captcha backgrounds.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action="/admin/media" method="get" className="flex gap-1">
          <input name="q" defaultValue={q} placeholder="Search…" maxLength={200}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          {folder && <input type="hidden" name="folder" value={folder} />}
          <button className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm dark:border-white/20">Go</button>
        </form>
        <MediaUploader folder={folder} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
        <Link href="/admin/media" className={`min-h-[44px] rounded-full px-4 py-2 font-semibold ${!folder ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>All</Link>
        {folders.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <Link href={`/admin/media?folder=${encodeURIComponent(f.name)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`min-h-[44px] rounded-full px-4 py-2 font-semibold ${folder === f.name ? "bg-brand text-white" : "border border-black/15 dark:border-white/20"}`}>{f.name}</Link>
            <form action={removeFolder}><input type="hidden" name="id" value={f.id} />
              <button aria-label={`Delete folder ${f.name}`} className="p-2 text-xs opacity-60 hover:opacity-100">✕</button></form>
          </span>
        ))}
        <form action={makeFolder} className="flex gap-1">
          <input name="name" required placeholder="+ folder" maxLength={60}
            className="min-h-[44px] w-28 rounded-xl border border-dashed border-black/20 bg-transparent px-3 text-sm dark:border-white/20" />
        </form>
      </div>
      <MediaGallery
        items={items.map((m) => ({
          id: m.id, alt: m.alt, filename: m.filename, folder: m.folder,
          src: m.url || (m.filename ? `/uploads/${m.filename}` : ""),
        }))}
        remove={remove}
        saveAlt={saveAlt}
      />
      {items.length === 0 && <p className="mt-2 text-sm text-zinc-500">Empty — upload the first image, or register one by URL from any picker.</p>}
    </>
  );
}
