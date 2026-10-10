"use client";

import { useState } from "react";
import { useBgWorker } from "./use-bg-worker";
import { useRouter } from "next/navigation";
import { Carousel } from "@mantine/carousel";
import { Dropzone, IMAGE_MIME_TYPE } from "@mantine/dropzone";
import { Lightbox } from "@mantine/lightbox";
import { NoSsr } from "@/components/no-ssr";
import { notifications } from "@mantine/notifications";

interface Item { id: number; src: string; alt: string }

export function MediaUploader({ folder }: { folder: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function send(files: File[]) {
    const file = files[0];
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    if (folder) form.append("folder", folder);
    const res = await fetch("/api/media/upload", { method: "POST", body: form });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      notifications.show({ title: "Uploaded", message: `${d.via === "r2" ? "R2" : "local"} · ${d.url}`, color: "teal" });
      router.refresh();
    } else {
      notifications.show({ title: "Upload failed", message: d.error ?? "", color: "red" });
    }
  }
  return (
    <NoSsr fallback={<p className="text-sm text-zinc-500">Loading uploader…</p>}>
    <Dropzone onDrop={(f) => void send(f)} accept={IMAGE_MIME_TYPE} maxSize={2 * 1024 * 1024} loading={busy}
      className="min-h-[44px] rounded-xl border border-dashed border-black/20 px-4 py-2 text-sm dark:border-white/20">
      <p className="text-center text-zinc-500">{busy ? "Uploading…" : "Drop image here or click (2MB)"}</p>
    </Dropzone>
    </NoSsr>
  );
}

export function MediaGallery({ items, remove, saveAlt }: {
  items: { id: number; src: string; alt: string; filename: string; folder: string }[];
  remove: (form: FormData) => void;
  saveAlt: (form: FormData) => void;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const bg = useBgWorker();
  const withSrc = items.filter((i) => i.src);
  const slides = withSrc.map((m) => ({ type: "image" as const, src: m.src, title: m.alt }));
  const zoom = (id: number) => setOpen(Math.max(0, withSrc.findIndex((w) => w.id === id)));
  return (
    <NoSsr>
    <>
      {withSrc.length > 1 && (
        <div className="mt-4">
          <Carousel withIndicators height={220} slideSize="33.333%" slideGap="md" emblaOptions={{ loop: true }}>
            {withSrc.slice(0, 12).map((m) => (
              // eslint-disable-next-line @next/next/no-img-element
              <Carousel.Slide key={m.id}><img src={m.src} alt={m.alt} loading="lazy"
                onClick={() => zoom(m.id)} className="h-[220px] w-full cursor-zoom-in rounded-xl object-cover" /></Carousel.Slide>
            ))}
          </Carousel>
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {items.map((m, i) => (
          <div key={m.id} className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
            {m.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.src} alt={m.alt || m.filename} loading="lazy" onClick={() => zoom(m.id)}
                className="aspect-square w-full cursor-zoom-in object-cover" />
            ) : <p className="p-2 text-xs text-zinc-500">no file</p>}
            <div className="grid gap-1 p-2">
              <span className="truncate font-mono text-[11px]">{m.src}</span>
              <form action={saveAlt} className="flex gap-1">
                <input type="hidden" name="id" value={m.id} />
                <input name="alt" defaultValue={m.alt} placeholder="alt text" maxLength={160}
                  className="min-h-[44px] w-full rounded-lg border border-black/15 bg-transparent px-2 text-xs dark:border-white/20" />
              </form>
              <div className="flex items-center justify-between gap-1">
                <span className="font-mono text-[11px] text-zinc-500">{m.folder || "—"}</span>
                <span className="flex gap-1">
                  {m.src && /\.(png|jpe?g|webp)$/i.test(m.src) && (
                    <button onClick={() => void bg.run(m.src, m.id)} disabled={bg.busyId === m.id}
                      aria-label={`Remove background from ${m.alt || m.filename}`}
                      className="min-h-[44px] rounded-lg border border-black/15 px-2 text-xs font-semibold disabled:opacity-40 dark:border-white/20">
                      {bg.busyId === m.id ? "…" : "BG✂"}</button>
                  )}
                  <form action={remove}><input type="hidden" name="id" value={m.id} />
                    <button className="min-h-[44px] rounded-lg border border-black/15 px-2 text-xs dark:border-white/20">Del</button></form>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {bg.note && <p role="status" className="mt-2 text-xs text-zinc-500">{bg.note}</p>}
      <Lightbox opened={open !== null} onClose={() => setOpen(null)} slides={slides}
        currentIndex={open ?? 0} onIndexChange={setOpen} />
    </>
    </NoSsr>
  );
}
