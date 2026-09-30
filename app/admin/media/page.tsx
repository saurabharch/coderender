import { revalidatePath } from "next/cache";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";

async function remove(form: FormData) {
  "use server";
  await requireTeam();
  const row = getDb().prepare("SELECT filename FROM MediaAsset WHERE id=?").get(Number(form.get("id"))) as
    { filename: string } | undefined;
  if (row) {
    await unlink(join(process.cwd(), "public", "uploads", row.filename)).catch(() => {});
    getDb().prepare("DELETE FROM MediaAsset WHERE id=?").run(Number(form.get("id")));
  }
  revalidatePath("/admin/media");
}

export default async function MediaAdmin() {
  const rows = getDb().prepare("SELECT * FROM MediaAsset ORDER BY id DESC LIMIT 100").all() as
    { id: number; filename: string; mime: string; size: number }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Media library</h1>
      <form action="/api/media/upload" method="post" encType="multipart/form-data" className="mt-4 flex flex-wrap items-center gap-2">
        <input type="file" name="file" accept="image/*" required className="text-sm" />
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Upload</button>
      </form>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((m) => (
          <div key={m.id} className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/uploads/${m.filename}`} alt={m.filename} className="aspect-square w-full object-cover" loading="lazy" />
            <div className="flex items-center justify-between gap-1 p-2">
              <span className="truncate font-mono text-[11px]">/uploads/{m.filename}</span>
              <form action={remove}><input type="hidden" name="id" value={m.id} />
                <button className="min-h-[44px] rounded-lg border border-black/15 px-2 text-xs dark:border-white/20">Del</button></form>
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <p className="mt-2 text-sm text-zinc-500">Empty — upload the first image. Copy a URL to use it anywhere.</p>}
    </>
  );
}
