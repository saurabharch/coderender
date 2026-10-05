import { getPref, setPref } from "./store";
import { runLocal } from "./jobs";
import { infraCheck, reportInfraTrouble } from "./infra";

let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  const check = async () => {
    try {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      if (now.getHours() === 23 && now.getMinutes() >= 55 && getPref("daily_report", "on") === "on") {
        const today = now.toISOString().slice(0, 10);
        if (getPref("last_report_day", "") !== today) {
          setPref("last_report_day", today);
          await runLocal("dailyReport");
        }
      }
    } catch (e) {
      console.error("[daily-report]", e);
    }
  };
  setInterval(check, 60_000);
  setInterval(async () => {
    try {
      const { runQueueTick } = await import("./queue");
      await runQueueTick(5);
      const { runHookTick } = await import("./hooks");
      await runHookTick(10);
    } catch (e) {
      console.error("[queue]", e);
    }
  }, 60_000);
  setInterval(async () => {
    try {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      if (now.getHours() === 3 && now.getMinutes() < 10 && getPref("backup", "on") === "on") {
        const today = now.toISOString().slice(0, 10);
        if (getPref("last_backup_day", "") !== today) {
          setPref("last_backup_day", today);
          const { execFile } = await import("node:child_process");
          const { join } = await import("node:path");
          await new Promise<void>((done) => {
            execFile("bash", [join(process.cwd(), "scripts/backup.sh")], { timeout: 120_000 }, (e, stdout) => {
              console.log(`[backup] ${e ? `FAILED: ${e.message}` : String(stdout).split("\n")[0]}`);
              done();
            });
          });
        }
      }
    } catch (e) {
      console.error("[backup]", e);
    }
  }, 600_000);
  setInterval(async () => {
    try {
      const { slaTick } = await import("./tickets");
      const out = await slaTick();
      if (out.length) console.log(`[sla] ${out.join("; ")}`);
    } catch (e) {
      console.error("[sla]", e);
    }
  }, 600_000);
  setInterval(async () => {
    try {
      const { stockAlertTick } = await import("./inventory");
      const fresh = stockAlertTick();
      if (fresh.length) console.log(`[stock] low: ${fresh.map((f) => f.name).join(", ")}`);
      const { campaignTick, cartRecoveryTick } = await import("./retail");
      const sent = await campaignTick();
      if (sent) console.log(`[campaign] sent ${sent}`);
      const rec = await cartRecoveryTick();
      if (rec) console.log(`[carts] recovered ${rec}`);
    } catch (e) {
      console.error("[stock]", e);
    }
  }, 1800_000);
  setInterval(async () => {
    try {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      if (now.getHours() === 9 && now.getMinutes() < 10 && getPref("reminders", "on") === "on") {
        const today = now.toISOString().slice(0, 10);
        if (getPref("last_remind_day", "") !== today) {
          setPref("last_remind_day", today);
          const { reminderTick } = await import("./vyapar");
          const n = await reminderTick();
          if (n) console.log(`[reminders] sent ${n}`);
        }
      }
    } catch (e) {
      console.error("[reminders]", e);
    }
  }, 600_000);
  setInterval(async () => {
    try {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      if (now.getHours() === 9 && now.getMinutes() < 10 && getPref("payout_digest", "on") === "on") {
        const today = now.toISOString().slice(0, 10);
        if (getPref("last_payout_day", "") !== today) {
          setPref("last_payout_day", today);
          const { payoutDigest } = await import("./partners");
          const { getDb } = await import("./store");
          const lines = payoutDigest();
          if (lines.length) {
            getDb().prepare("INSERT INTO Notification (title, body, audience) VALUES (?,?,?)").run(
              `Payout digest (${lines.length})`, lines.join("\n").slice(0, 2000), "team");
            const { sendMail } = await import("./mailer");
            const { ADMIN_EMAILS } = await import("./auth");
            for (const r of ADMIN_EMAILS)
              await sendMail(r, `Partner payouts due (${lines.length})`, `<pre>${lines.join("\n").slice(0, 3000)}</pre>`).catch(() => {});
          }
        }
      }
    } catch (e) {
      console.error("[payouts]", e);
    }
  }, 600_000);
  setInterval(async () => {
    try {
      await reportInfraTrouble(infraCheck());
    } catch (e) {
      console.error("[infra]", e);
    }
  }, 3600_000);
  setInterval(async () => {
    try {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      if (now.getHours() === 2 && now.getMinutes() < 10 && getPref("learning", "on") === "on") {
        const today = now.toISOString().slice(0, 10);
        if (getPref("last_distill_day", "") !== today) {
          setPref("last_distill_day", today);
          const { runNightlyDistill } = await import("./learn");
          const r = await runNightlyDistill();
          console.log(`[distill] ${r.distilled} exemplars`);
        }
      }
    } catch (e) {
      console.error("[distill]", e);
    }
  }, 600_000);
  void check();
}
