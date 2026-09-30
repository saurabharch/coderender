import { infer, type Scope } from "./ai-gateway";
import { getDb } from "./store";
import { SERVICES } from "./services";

// AgentKit-shaped primitives (agents, tools, router network, shared state),
// executed through the secure gateway. Swapping in @inngest/agent-kit later is
// mechanical once zod-v4 migration unblocks the package.

export interface ToolCtx {
  userId: number;
}

export interface Tool {
  name: string;
  desc: string;
  run: (ctx: ToolCtx, args: Record<string, string>) => Promise<string>;
}

const tools: Record<string, Tool> = {
  service_briefing: {
    name: "service_briefing",
    desc: "Look up a service briefing by keyword",
    run: async (_ctx, args) => {
      const q = (args.q || "").toLowerCase();
      const s = SERVICES.find((x) => x.title.toLowerCase().includes(q) || x.slug.includes(q.replace(/\s+/g, "-")));
      return s ? `${s.title}: ${s.tagline} Includes: ${s.includes.join("; ")}. ${s.timeline}. ${s.priceHint}.` : "No matching service.";
    },
  },
  pricing_estimate: {
    name: "pricing_estimate",
    desc: "DRAFT ladder prices",
    run: async () => "Audit DRAFT ₹2,999 (credited). Growth packs from DRAFT ₹14,999. Retainers from DRAFT ₹11,999/mo. Final quotes always in writing.",
  },
  own_threads: {
    name: "own_threads",
    desc: "List this user's own chat threads (tenant isolation: never another user's)",
    run: async (ctx) => {
      const rows = getDb().prepare("SELECT id, title FROM ChatThread WHERE userId=? ORDER BY id DESC LIMIT 5").all(ctx.userId);
      return JSON.stringify(rows);
    },
  },
};

const SYSTEMS: Record<Exclude<Scope, "infra">, string> = {
  support: "You are CodeRender support. Answer booking/order/how-it-works questions briefly and warmly.",
  product: "You describe CodeRender services factually from the provided briefing context. Never invent features or prices.",
  pricing: "You quote ONLY the provided DRAFT ladder and always say final quotes are in writing.",
  partner: "You explain the partner tiers (referrer/reseller/city), free to join, commissions per written terms. Never promise earnings.",
};

function routeAgent(message: string): Exclude<Scope, "infra"> {
  const t = message.toLowerCase();
  if (/partner|affiliate|commission|earn|refer/.test(t)) return "partner";
  if (/price|cost|charge|fee|₹|plan|package/.test(t)) return "pricing";
  if (/service|offer|what.*do|website|seo|gbp|whatsapp|automation/.test(t)) return "product";
  return "support";
}

export async function runNetwork(opts: { userId: number; message: string; threadId?: number }) {
  const scope = routeAgent(opts.message);
  let context = "";
  if (scope === "product") {
    const hit = SERVICES.find((s) => opts.message.toLowerCase().includes(s.title.toLowerCase().split(" ")[0]));
    if (hit) context = await tools.service_briefing.run({ userId: opts.userId }, { q: hit.title });
  }
  if (scope === "pricing") context = await tools.pricing_estimate.run({ userId: opts.userId }, {});
  const system = `${SYSTEMS[scope]}${context ? `\nContext: ${context}` : ""}`;
  const r = await infer({ scope, userId: opts.userId, system, user: opts.message });
  return { ...r, scope };
}
