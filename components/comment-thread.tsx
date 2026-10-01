"use client";

import { useEffect, useState } from "react";

interface C {
  id: number; parentId: number | null; name: string; body: string;
  likes: number; liked?: boolean; mine?: boolean; createdAt: string;
  replies: C[];
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "request failed");
  return data;
}

function Item({ c, resourceType, resourceId, onChange, compact }: {
  c: C; resourceType: string; resourceId: string; onChange: () => void; compact?: boolean;
}) {
  const [reply, setReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [name, setName] = useState("");

  async function post(parentId?: number) {
    if (text.trim().length < 2) return;
    await api("/api/comments", {
      method: "POST",
      body: JSON.stringify({
        resourceType, resourceId, parentId,
        name: name.trim() || c.name, body: text.trim(),
      }),
    });
    setText("");
    setReply(false);
    onChange();
  }

  return (
    <div className={compact ? "rounded-xl border border-black/10 p-2 dark:border-white/10" : "rounded-2xl border border-black/10 p-3 dark:border-white/10"}>
      <p className="text-sm"><b>{c.name}</b> <span className="text-xs text-zinc-500">{c.createdAt.slice(0, 10)}</span></p>
      {editing ? (
        <span className="mt-1 grid gap-1">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000}
            className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
          <span className="flex gap-1">
            <button onClick={async () => { await api(`/api/comments/${c.id}`, { method: "PATCH", body: JSON.stringify({ body: text }) }); setEditing(false); onChange(); }}
              className="min-h-[36px] rounded-lg bg-brand px-3 text-xs font-semibold text-white">Save</button>
            <button onClick={() => setEditing(false)} className="min-h-[36px] rounded-lg border border-black/15 px-3 text-xs dark:border-white/20">Cancel</button>
          </span>
        </span>
      ) : (
        <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
        <button aria-label="Like comment" onClick={async () => { await api(`/api/comments/${c.id}/like`, { method: "POST" }); onChange(); }}
          className={`min-h-[36px] rounded-lg border px-2.5 ${c.liked ? "border-brand bg-brand/10 font-bold" : "border-black/15 dark:border-white/20"}`}>
          ♥ {c.likes}
        </button>
        <button onClick={() => { setReply((r) => !r); setText(""); }} className="min-h-[36px] rounded-lg border border-black/15 px-2.5 dark:border-white/20">Reply</button>
        {c.mine && (
          <>
            <button onClick={() => { setEditing(true); setText(c.body); }} className="min-h-[36px] rounded-lg border border-black/15 px-2.5 dark:border-white/20">Edit</button>
            <button onClick={async () => { if (confirm("Delete this comment?")) { await api(`/api/comments/${c.id}`, { method: "DELETE" }); onChange(); } }}
              className="min-h-[36px] rounded-lg border border-black/15 px-2.5 dark:border-white/20">Delete</button>
          </>
        )}
      </div>
      {reply && (
        <span className="mt-1.5 grid gap-1">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={80}
            className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={2000} placeholder="Write a reply… (abuse is auto-hidden)"
            className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
          <button onClick={() => void post(c.id)} className="min-h-[44px] w-fit rounded-xl bg-brand px-4 text-xs font-semibold text-white">Post reply</button>
        </span>
      )}
      {c.replies.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-black/10 pl-2 dark:border-white/15">
          {c.replies.map((r) => (
            <Item key={r.id} c={r} resourceType={resourceType} resourceId={resourceId} onChange={onChange} compact />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ resourceType, resourceId, title, compact }: {
  resourceType: string; resourceId: string; title?: string; compact?: boolean;
}) {
  const [items, setItems] = useState<C[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const d = await api(`/api/comments?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`).catch(() => null);
    if (d?.comments) setItems(d.comments);
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function post() {
    if (name.trim().length < 2 || text.trim().length < 2) {
      setNotice("Add your name and a comment first.");
      return;
    }
    setNotice("");
    await api("/api/comments", {
      method: "POST",
      body: JSON.stringify({ resourceType, resourceId, name: name.trim(), body: text.trim() }),
    }).catch(() => setNotice("Couldn't post — try again."));
    setText("");
    void load();
    setNotice("Posted! Visible after approval (abuse is auto-hidden).");
  }

  return (
    <div>
      {title && <p className="text-sm font-bold">{title} ({items.length})</p>}
      <div className="mt-2 space-y-2">
        {items.map((c) => (
          <Item key={c.id} c={c} resourceType={resourceType} resourceId={resourceId} onChange={() => void load()} compact={compact} />
        ))}
        {items.length === 0 && <p className="text-sm text-zinc-500">No comments yet — start the discussion.</p>}
      </div>
      <div className="mt-3 grid gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={80}
          className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000}
          placeholder="Write a comment… (abuse is auto-hidden)"
          className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20" />
        <button onClick={() => void post()} className="min-h-[44px] w-fit rounded-xl bg-brand px-5 text-sm font-semibold text-white">Post comment</button>
        {notice && <p className="text-xs text-zinc-500">{notice}</p>}
      </div>
    </div>
  );
}

export function CommentCount({ resourceType, resourceId }: { resourceType: string; resourceId: string }) {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    fetch(`/api/comments?resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}&count=1`)
      .then((r) => r.json()).then((d) => setN(typeof d.count === "number" ? d.count : 0)).catch(() => setN(0));
  }, [resourceType, resourceId]);
  if (n === null || n === 0) return null;
  return <span className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/15">💬 {n}</span>;
}
