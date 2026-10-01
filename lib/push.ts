import webpush from "web-push";
import { getDb } from "./store";

function configured(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@coderender.in", pub, priv);
    return true;
  } catch {
    return false;
  }
}

export function pushReady(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function pushTo(sub: { endpoint: string; p256dh: string; auth: string }, title: string, body: string): Promise<boolean> {
  if (!configured()) return false;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body })
    );
    return true;
  } catch {
    return false;
  }
}

export async function broadcastPush(title: string, body: string): Promise<{ sent: number; total: number }> {
  const subs = getDb().prepare("SELECT endpoint, p256dh, auth FROM PushSubscription").all() as
    { endpoint: string; p256dh: string; auth: string }[];
  let sent = 0;
  for (const s of subs) {
    if (await pushTo(s, title, body)) sent++;
    else {
      // drop dead endpoints so the list stays clean
      try { getDb().prepare("DELETE FROM PushSubscription WHERE endpoint=?").run(s.endpoint); } catch { /* ignore */ }
    }
  }
  return { sent, total: subs.length };
}
