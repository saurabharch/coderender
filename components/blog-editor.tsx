"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";

// Blog body editor: headings, marks, lists, quotes, links, images.
// Submits HTML through the parent server form (hidden input). Legacy
// plain-text bodies load as a single paragraph and save back as HTML.
export function BlogEditor({ name, initial }: { name: string; initial?: string }) {
  const [html, setHtml] = useState(initial && initial.trim().startsWith("<") ? initial : `<p>${(initial ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`);
  const [imgUrl, setImgUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState<{ local: { message: string; sample: string }[]; remote: { message: string; sample: string }[]; via: string | null } | null>(null);
  const [proving, setProving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
    ],
    content: html,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap-body min-h-[220px] rounded-xl border border-black/15 bg-transparent px-3 py-2 text-[15px] leading-relaxed focus:outline-none dark:border-white/20",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  useEffect(() => {
    // Keep the hidden input authoritative even before any keystroke.
    if (editor && !editor.isDestroyed) setHtml(editor.getHTML());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return <textarea name={name} defaultValue={initial ?? ""} rows={8} className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />;

  const btn = (active: boolean) =>
    `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-2 text-sm font-bold ${active ? "border-black bg-black text-white dark:bg-white dark:text-black" : "border-black/15 dark:border-white/20"}`;
  const run = (fn: () => void) => () => { fn(); editor.view.focus(); };

  async function uploadImage(file: File | undefined) {
    if (!file || !editor) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", "blog");
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const d = await res.json().catch(() => ({}));
      if (d.url) editor.chain().focus().setImage({ src: d.url }).run();
    } catch { /* keep editing */ }
    setBusy(false);
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formatting">
        <button type="button" onClick={run(() => editor.chain().focus().toggleBold().run())} aria-pressed={editor.isActive("bold")} aria-label="Bold" className={btn(editor.isActive("bold"))}>B</button>
        <button type="button" onClick={run(() => editor.chain().focus().toggleItalic().run())} aria-pressed={editor.isActive("italic")} aria-label="Italic" className={btn(editor.isActive("italic"))}><i>I</i></button>
        <button type="button" onClick={run(() => editor.chain().focus().toggleUnderline().run())} aria-pressed={editor.isActive("underline")} aria-label="Underline" className={btn(editor.isActive("underline"))}><u>U</u></button>
        <button type="button" onClick={run(() => editor.chain().focus().toggleStrike().run())} aria-pressed={editor.isActive("strike")} aria-label="Strikethrough" className={btn(editor.isActive("strike"))}>S</button>
        {([1, 2, 3] as const).map((l) => (
          <button key={l} type="button" onClick={run(() => editor.chain().focus().toggleHeading({ level: l }).run())} aria-pressed={editor.isActive("heading", { level: l })} aria-label={`Heading ${l}`} className={btn(editor.isActive("heading", { level: l }))}>H{l}</button>
        ))}
        <button type="button" onClick={run(() => editor.chain().focus().toggleBulletList().run())} aria-pressed={editor.isActive("bulletList")} aria-label="Bulleted list" className={btn(editor.isActive("bulletList"))}>•≡</button>
        <button type="button" onClick={run(() => editor.chain().focus().toggleOrderedList().run())} aria-pressed={editor.isActive("orderedList")} aria-label="Numbered list" className={btn(editor.isActive("orderedList"))}>1≡</button>
        <button type="button" onClick={run(() => editor.chain().focus().toggleBlockquote().run())} aria-pressed={editor.isActive("blockquote")} aria-label="Quote" className={btn(editor.isActive("blockquote"))}>❝</button>
        <button type="button" onClick={run(() => {
          const prev = editor.getAttributes("link").href ?? "";
          const href = prompt("Link URL (https://…)", prev);
          if (href === null) return;
          if (!href.trim()) editor.chain().focus().unsetLink().run();
          else editor.chain().focus().setLink({ href: href.trim() }).run();
        })} aria-pressed={editor.isActive("link")} aria-label="Link" className={btn(editor.isActive("link"))}>🔗</button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <input value={imgUrl} onChange={(e) => setImgUrl(e.target.value)} placeholder="Image URL (https://…) or upload →" maxLength={500}
          className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <button type="button" disabled={!imgUrl.trim()} onClick={() => { editor.chain().focus().setImage({ src: imgUrl.trim() }).run(); setImgUrl(""); }}
          className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold disabled:opacity-40 dark:border-white/20">Insert</button>
        <label className="flex min-h-[44px] cursor-pointer items-center rounded-xl border border-black/15 px-4 text-sm font-semibold dark:border-white/20">
          {busy ? "Uploading…" : "Upload"}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void uploadImage(e.target.files?.[0])} />
        </label>
      </div>
      <EditorContent editor={editor} />
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" disabled={proving} onClick={() => void (async () => {
          setProving(true);
          try {
            const res = await fetch("/api/proofread", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: editor.getText().slice(0, 20000) }),
            });
            const d = await res.json().catch(() => ({}));
            if (res.ok) setProof({ local: d.local ?? [], remote: d.remote ?? [], via: d.via ?? null });
          } catch { /* keep editing */ }
          setProving(false);
        })()}
          className="min-h-[44px] rounded-xl border border-black/15 px-4 text-sm font-semibold disabled:opacity-40 dark:border-white/20">
          {proving ? "Checking…" : "Check writing"}</button>
        {proof && <span className="text-xs text-zinc-500">{proof.local.length + proof.remote.length === 0 ? "Clean ✓" : `${proof.local.length + proof.remote.length} note(s)${proof.via ? " (incl. LanguageTool)" : ""}`}</span>}
      </div>
      {proof && (proof.local.length > 0 || proof.remote.length > 0) && (
        <ul className="space-y-1 text-xs">
          {[...proof.local.map((x) => ({ ...x, src: "local" })), ...proof.remote.map((x) => ({ ...x, src: "LanguageTool" }))].slice(0, 12).map((x, i) => (
            <li key={i} className="rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
              <b>{x.src}:</b> {x.message}{x.sample ? <span className="font-mono text-zinc-500"> — “{x.sample}”</span> : null}
            </li>
          ))}
        </ul>
      )}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
