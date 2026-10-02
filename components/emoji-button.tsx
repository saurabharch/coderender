"use client";

import { useState } from "react";
import { PALETTE, expandShortcodes } from "@/lib/emoji";

// Emoji palette popover inserting at the cursor. Pair with expandShortcodes
// on save for `:code:` typing plus native OS picker support.
export function EmojiButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Insert emoji"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-black/15 text-lg dark:border-white/20">🙂</button>
      {open && (
        <span className="absolute bottom-12 left-0 z-50 grid max-h-48 w-64 grid-cols-8 gap-0.5 overflow-auto rounded-2xl border border-black/10 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-900">
          {PALETTE.map((e) => (
            <button key={e} type="button" onClick={() => { onPick(e); setOpen(false); }}
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-lg hover:bg-black/5 dark:hover:bg-white/10">{e}</button>
          ))}
        </span>
      )}
    </span>
  );
}

// Wrap any text input with shortcode expansion on top of its onChange.
export function withEmoji(value: string): string {
  return expandShortcodes(value);
}
