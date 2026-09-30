import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { getDb } from "./store";

// Single chokepoint for ALL model inference. Only these scopes may call it.
export const SCOPES = ["support", "product", "pricing", "partner", "infra"] as const;
export type Scope = (typeof SCOPES)[number];

const SANDBOX = "/data/data/com.termux/files/usr/tmp/opencode/ai-sandbox";
try { mkdirSync(SANDBOX, { recursive: true }); } catch { /* exists */ }

// PII redaction: emails + phone-like digit runs never leave the server.
export function redact(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "[phone]");
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

function runCli(prompt: string, timeoutMs = 100000): Promise<string> {
  return new Promise((resolve) => {
    // opencode dies with SIGINT under plain pipes, so `script` gives it a pty.
    // Prompt is single-quote escaped; runs in an empty sandbox dir so the
    // model has no project files in scope.
    const child = execFile(
      "script",
      ["-qec", `opencode run --format json --standalone ${shellQuote(prompt)}`, "/dev/null"],
      { cwd: SANDBOX, timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 },
      (_err, stdout) => {
        const texts: string[] = [];
        for (const line of String(stdout || "").split("\n")) {
          try {
            const o = JSON.parse(line);
            if (o.type === "text" && o.part?.text) texts.push(o.part.text);
          } catch { /* progress frames + pty echo */ }
        }
        resolve(texts.join("\n").trim());
      }
    );
    child.stdin?.end();
  });
}

async function runProvider(system: string, user: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com";
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: 400,
      }),
    });
    if (!res.ok) return "";
    const j = await res.json();
    return String(j.choices?.[0]?.message?.content ?? "").slice(0, 2000);
  } catch {
    return "";
  }
}

export interface GatewayResult {
  text: string;
  runtime: "opencode-cli" | "provider" | "none" | "busy";
}

let active = 0;
const MAX_CONCURRENT = 2;

export async function infer(opts: {
  scope: Scope;
  userId: number;
  system: string;
  user: string;
}): Promise<GatewayResult> {
  if (!SCOPES.includes(opts.scope)) throw new Error("scope denied");
  if (active >= MAX_CONCURRENT) {
    try {
      getDb().prepare("INSERT INTO AiAudit (userId, scope, excerpt, runtime) VALUES (?,?,?,?)")
        .run(opts.userId, opts.scope, "", "busy");
    } catch { /* ignore */ }
    return { text: "", runtime: "busy" };
  }
  active++;
  try {
    const clean = redact(opts.user).slice(0, 2000);
    const prompt = `${opts.system}\n\nScope: ${opts.scope}. Customer message: ${clean}\nReply in 1–3 sentences. Never promise rankings, revenue, or virality.`;
    let text = await runCli(prompt);
    let runtime: GatewayResult["runtime"] = text ? "opencode-cli" : "none";
    if (!text) {
      text = await runProvider(opts.system, clean);
      if (text) runtime = "provider";
    }
    try {
      getDb().prepare("INSERT INTO AiAudit (userId, scope, excerpt, runtime) VALUES (?,?,?,?)")
        .run(opts.userId, opts.scope, clean.slice(0, 200), runtime);
    } catch { /* audit never breaks inference */ }
    return { text, runtime };
  } finally {
    active--;
  }
}
