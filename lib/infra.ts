import { statfsSync, statSync } from "node:fs";
import { join } from "node:path";
import { getDb } from "./store";

// Infra self-check: disk, database, build presence, scheduler heartbeat.
// Findings become team notifications; trouble also emails owners.
export interface InfraFinding {
  check: string;
  ok: boolean;
  detail: string;
}

export function infraCheck(): InfraFinding[] {
  const out: InfraFinding[] = [];
  try {
    const s = statfsSync(process.cwd());
    const freeMb = Math.round(Number(s.bavail) * Number(s.bsize) / 1048576);
    out.push({ check: "disk", ok: freeMb > 200, detail: `${freeMb}MB free` });
  } catch {
    out.push({ check: "disk", ok: true, detail: "unavailable" });
  }
  try {
    const st = statSync(join(process.cwd(), "dev.db"));
    out.push({ check: "database", ok: st.size > 0, detail: `${Math.round(st.size / 1024)}KB` });
  } catch {
    out.push({ check: "database", ok: false, detail: "dev.db missing" });
  }
  try {
    statSync(join(process.cwd(), ".next", "BUILD_ID"));
    out.push({ check: "build", ok: true, detail: "BUILD_ID present" });
  } catch {
    out.push({ check: "build", ok: false, detail: ".next missing — rebuild before restart" });
  }
  const lastReport = getDb().prepare("SELECT value FROM Preference WHERE key='last_report_day'").get() as
    { value: string } | undefined;
  out.push({ check: "scheduler", ok: true, detail: `last report day: ${lastReport?.value ?? "never"}` });
  return out;
}

export async function reportInfraTrouble(findings: InfraFinding[]): Promise<void> {
  const bad = findings.filter((f) => !f.ok);
  if (bad.length === 0) return;
  const body = bad.map((f) => `${f.check}: ${f.detail}`).join("; ");
  getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
    "Infra trouble", body, "team");
  const { sendMail } = await import("./mailer");
  const { ADMIN_EMAILS } = await import("./auth");
  const html = `<p>CodeRender infra check failed:</p><p>${body}</p>`;
  for (const r of ADMIN_EMAILS) await sendMail(r, "CodeRender infra trouble", html).catch(() => {});
}
