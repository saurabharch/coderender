import { getDb } from "./store";
import { rateLimited } from "./rate-limit";

// Lifecycle hooks mirroring the plugin contract: abuse/rate checks before,
// analytics + eval after, failure votes on error.
export async function onBeforeChat(opts: { userId: number; fingerprint?: string }): Promise<string | null> {
  if (rateLimited(`team-chat:${opts.userId}`, 60, 3600_000))
    return "slow down — try again in a bit";
  return null;
}

export async function onAfterChat(opts: {
  threadId: number; userId: number; ms: number; tools: string[]; ok: boolean;
}): Promise<void> {
  try {
    getDb().prepare("INSERT INTO Event (type, path, data) VALUES (?,?,?)").run(
      "chat", "/ai-chat",
      JSON.stringify({ threadId: opts.threadId, ms: opts.ms, tools: opts.tools, ok: opts.ok }).slice(0, 1000)
    );
  } catch { /* telemetry never breaks chat */ }
}

export async function onErrorChat(opts: { threadId?: number }): Promise<void> {
  try {
    if (opts.threadId)
      getDb().prepare("INSERT INTO Vote (threadId, turnIdx, vote) VALUES (?,?,?)").run(opts.threadId, 0, "fail");
  } catch { /* ignore */ }
}
