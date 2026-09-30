import { getPref, setPref } from "./store";
import { sendDailyReport } from "./reporter";

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
          await sendDailyReport();
        }
      }
    } catch (e) {
      console.error("[daily-report]", e);
    }
  };
  setInterval(check, 60_000);
  void check();
}
