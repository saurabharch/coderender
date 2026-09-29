import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap section max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">404</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">This page took a day off.</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">Try an industry page or talk to us directly.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="beam beam-rainbow btn-dark inline-flex min-h-[44px] items-center rounded-full px-6 text-sm font-semibold">Back home →</Link>
        <Link href="/contact" className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 text-sm font-semibold dark:border-white/20">Contact us</Link>
      </div>
    </div>
  );
}
