"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="mt-4 min-h-[44px] rounded-xl border border-black/15 px-5 text-sm print:hidden dark:border-white/20">
      Print / PDF
    </button>
  );
}
