// Shared meeting-slot generator (IST business days). Single source used by
// the chat wizard, the schedule console, and reschedule flows.
export interface SlotOption {
  id: string;
  label: string;
}

export function nextSlots(count = 6): SlotOption[] {
  const out: SlotOption[] = [];
  const d = new Date();
  while (out.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0) continue;
    const day = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
    for (const t of ["11:00 AM", "4:00 PM"]) {
      out.push({ id: `${day} · ${t}`, label: `${day} · ${t}` });
      if (out.length >= count) break;
    }
  }
  return out;
}
