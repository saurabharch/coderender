"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <div className="wrap section max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Something broke</p>
          <h1 className="display-1 mt-2">Please try again</h1>
          <p className="mt-2 text-sm text-zinc-500">
            A loading hiccup (often a tab open across an update). Your data is safe.
            {error.digest ? ` Ref ${error.digest}.` : ""}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button onClick={() => reset()} className="min-h-[44px] rounded-full bg-brand px-6 text-sm font-semibold text-white">Try again</button>
            <button onClick={() => window.location.reload()} className="min-h-[44px] rounded-full border border-black/15 px-6 text-sm font-semibold dark:border-white/20">Reload page</button>
          </div>
        </div>
      </body>
    </html>
  );
}
