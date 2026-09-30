"use client";

import { useEffect, useState } from "react";

export function LiveNotices({ initial }: { initial: { title: string; body: string; createdAt: string }[] }) {
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    const es = new EventSource("/api/realtime");
    es.onmessage = () => setFresh(true);
    es.onerror = () => es.close();
    return () => es.close();
  }, []);
  return (
    <>
      {fresh && <p className="rounded-xl bg-brand-soft p-2 text-xs font-semibold dark:bg-white/10">New team notice arrived — refresh to read it.</p>}
      <ul className="mt-2 space-y-2 text-sm">
        {initial.map((n, i) => <li key={i} className="rounded-2xl border border-black/10 p-3 dark:border-white/10"><b>{n.title}</b><br />{n.body}</li>)}
        {initial.length === 0 && <li className="text-zinc-500">No notices.</li>}
      </ul>
    </>
  );
}
