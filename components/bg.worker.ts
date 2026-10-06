// Client-side WASM worker: fetches the queued image, runs @imgly background
// removal on-device (browser WASM — works where server Node cannot), posts
// the transparent bytes back. No secrets here — the server swaps the DB.
let busy = false;

self.onmessage = async (e: MessageEvent<{ imageUrl: string; jobId: number }>) => {
  if (busy) return;
  busy = true;
  try {
    const { imageUrl, jobId } = e.data ?? {};
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    const { removeBackground } = await import("@imgly/background-removal");
    const out = await removeBackground(blob);
    const buf = await out.arrayBuffer();
    (self.postMessage as (m: unknown, t: Transferable[]) => void)(
      { ok: true, jobId, bytes: buf }, [buf]
    );
  } catch (err) {
    (self.postMessage as (m: unknown) => void)({
      ok: false, jobId: (e.data as { jobId?: number } | undefined)?.jobId ?? 0,
      error: err instanceof Error ? err.message : "worker failed",
    });
  } finally {
    busy = false;
  }
};

export {};
