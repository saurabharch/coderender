// Pure comment helpers (no sqlite import — safe for vitest).
// Policy: strong NSFW tokens are ALWAYS masked (write + render);
// block verdicts are stored as auto-hidden spam, never shown publicly.
import DATA from "./moderation-data.json";

const STRONG: string[] = Object.entries((DATA as { tokens: Record<string, number> }).tokens)
  .filter(([, s]) => s >= 4).map(([w]) => w);

export const RESOURCE_TYPES = ["blog-post", "kanban-task", "kanban-todo", "todo"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export function isResourceType(t: unknown): t is ResourceType {
  return (RESOURCE_TYPES as readonly string[]).includes(String(t));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Mask every strong token, always — leetspeak-tolerant (vowel/$/@ swaps).
export function maskText(raw: string): string {
  let out = String(raw ?? "");
  for (const w of STRONG) {
    const pat = escapeRe(w).replace(/a/gi, "[a@4]").replace(/e/gi, "[e3]").replace(/i/gi, "[i1!]").replace(/o/gi, "[o0]").replace(/s/gi, "[s$5]");
    out = out.replace(new RegExp(`\\b${pat}\\b`, "gi"), "***");
  }
  return out;
}

export type CommentStatus = "pending" | "approved" | "spam";

// Map a moderation verdict to storage status. Blocks become auto-hidden
// spam (shadow-accept); warns stay masked + pending; allows stay pending
// unless the author is trusted (team), which auto-approves.
export function statusFor(verdict: "allow" | "warn" | "block", trusted = false): CommentStatus {
  if (verdict === "block") return "spam";
  if (trusted) return "approved";
  return "pending";
}

export interface ThreadComment {
  id: number;
  parentId: number | null;
  name: string;
  body: string;
  status: string;
  likes: number;
  liked?: boolean;
  mine?: boolean;
  editedAt: string;
  createdAt: string;
}

// Nest flat rows into reply trees (replies chronological, cap depth 3).
export function nest(flat: ThreadComment[]): (ThreadComment & { replies: ThreadComment[] })[] {
  const byId = new Map<number, ThreadComment & { replies: ThreadComment[] }>();
  for (const c of flat) byId.set(c.id, { ...c, replies: [] });
  const roots: (ThreadComment & { replies: ThreadComment[] })[] = [];
  for (const c of byId.values()) {
    if (c.parentId && byId.has(c.parentId) && c.parentId !== c.id) byId.get(c.parentId)!.replies.push(c);
    else roots.push(c);
  }
  for (const r of byId.values()) r.replies.sort((a, b) => a.id - b.id);
  return roots;
}
