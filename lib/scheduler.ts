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
      await reportInfraTrouble(infraCheck());
    } catch (e) {
      console.error("[infra]", e);
    }
  }, 3600_000);
  void check();
}
