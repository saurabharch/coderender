import Link from "next/link";

export const metadata = {
  title: "Offline",
  description: "You are offline. Queued sales stay on this device and sync automatically.",
};

// Precached by the service worker as the offline fallback shell. Static and
// dependency-free by design: it must render with zero network.
export default function OfflinePage() {
  return (
    <div className="wrap section max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Offline</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">No connection right now.</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        The counter keeps working: build the bill in POS and queued sales sync
        automatically when you are back online.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/admin/pos"
          className="inline-flex min-h-[44px] items-center rounded-full bg-brand px-6 text-sm font-semibold text-white">
          Open POS →
        </Link>
        <Link href="/"
          className="inline-flex min-h-[44px] items-center rounded-full border border-black/15 px-6 text-sm font-semibold dark:border-white/20">
          Back home
        </Link>
      </div>
    </div>
  );
}
