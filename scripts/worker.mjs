// Compose `worker` service: ticks the durable queue through the app's
// token-gated endpoint. Plain node cannot import lib/*.ts (extensionless
// TS imports + node:sqlite), so HTTP against the app container is the
// honest path — no fake "work" here. Without WORKER_TICK_TOKEN it idles
// with a warning; the app's own in-process scheduler keeps jobs moving.
const APP = process.env.APP_URL || "http://app:3100";
const TOKEN = process.env.WORKER_TICK_TOKEN || "";

const tick = async () => {
  if (!TOKEN) {
    console.log("[worker] WORKER_TICK_TOKEN unset — idling (app scheduler still runs)");
    return;
  }
  try {
    const res = await fetch(`${APP}/api/ops/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(25000),
    });
    const body = await res.text();
    console.log(`[worker] tick ${res.status} ${body.slice(0, 160)}`);
  } catch (e) {
    console.error("[worker]", e?.message || e);
  }
};

console.log(`[worker] queue ticks every 60s against ${APP}`);
await tick();
setInterval(tick, 60_000);
