import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIn, checkOut, deleteHoliday, getRun, leaveBalances, listHolidays, listLeaves, listRuns, listShifts, logTime, markAttendance, monthAttendance, onboardList, onboardToggle, openRun, payRun, requestLeave, saveHoliday, saveShift, setLeave, setRoster, todayPresence, weekRoster, weekHours } from "@/lib/people";
import { shopGate } from "@/lib/shop-auth";

// GET ?run= | ?runs=1 | ?attend=&month= | ?week=&from=
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const url = new URL(req.url);
  if (url.searchParams.get("run")) {
    const r = getRun(Number(url.searchParams.get("run")));
    return r ? NextResponse.json(r) : NextResponse.json({ error: "no run" }, { status: 404 });
  }
  if (url.searchParams.get("attend") && url.searchParams.get("month")) {
    return NextResponse.json(monthAttendance(Number(url.searchParams.get("attend")), url.searchParams.get("month")!));
  }
  if (url.searchParams.get("week")) {
    return NextResponse.json({ hours: weekHours(Number(url.searchParams.get("week")), url.searchParams.get("from") || new Date().toISOString().slice(0, 10)) });
  }
  if (url.searchParams.get("leaves") !== null) {
    return NextResponse.json({ leaves: listLeaves(url.searchParams.get("leaves") || "") });
  }
  if (url.searchParams.get("presence") !== null) {
    return NextResponse.json({ presence: todayPresence(url.searchParams.get("day") || "") });
  }
  if (url.searchParams.get("balances") !== null) {
    return NextResponse.json({ balances: leaveBalances(Number(url.searchParams.get("balances") || 0)) });
  }
  if (url.searchParams.get("holidays") !== null) {
    return NextResponse.json({ holidays: listHolidays() });
  }
  if (url.searchParams.get("shifts") !== null) {
    return NextResponse.json({ shifts: listShifts() });
  }
  if (url.searchParams.get("roster") !== null) {
    return NextResponse.json(weekRoster(url.searchParams.get("roster") || new Date().toISOString().slice(0, 10)));
  }
  if (url.searchParams.get("onboard") !== null) {
    return NextResponse.json({ items: onboardList(Number(url.searchParams.get("onboard") || 0)) });
  }
  return NextResponse.json({ runs: listRuns() });
}

// POST {month} open | {pay} run | {mark} | {leave...} | {approve} | {time...}
export async function POST(req: Request) {
  const deny = await shopGate(req, true);
  if (deny) return deny;
  const body = await req.json().catch(() => null);
  try {
    if (body?.month) {
      const parsed = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "month like YYYY-MM" }, { status: 422 });
      const id = openRun(parsed.data.month);
      return NextResponse.json({ ok: true, id, run: getRun(id) });
    }
    if (body?.pay) {
      const parsed = z.object({ pay: z.number().int(), accountId: z.number().int().optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad pay" }, { status: 422 });
      return NextResponse.json({ ok: true, ...(await payRun(parsed.data.pay, parsed.data.accountId ?? 1)) });
    }
    if (body?.mark) {
      const parsed = z.object({
        mark: z.number().int(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: z.enum(["present", "absent", "half", "leave"]),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad mark" }, { status: 422 });
      markAttendance(parsed.data.mark, parsed.data.day, parsed.data.status);
      return NextResponse.json({ ok: true });
    }
    if (body?.leave) {
      const parsed = z.object({
        leave: z.number().int(), fromDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        toDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kind: z.string().max(20).optional(),
        notes: z.string().max(300).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad leave" }, { status: 422 });
      return NextResponse.json({ ok: true, id: requestLeave({ employeeId: parsed.data.leave, ...parsed.data }) });
    }
    if (body?.approve) {
      const parsed = z.object({ approve: z.number().int(), to: z.enum(["approved", "rejected"]) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad approve" }, { status: 422 });
      setLeave(parsed.data.approve, parsed.data.to);
      return NextResponse.json({ ok: true });
    }
    if (body?.checkin) {
      const parsed = z.object({ checkin: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad checkin" }, { status: 422 });
      return NextResponse.json({ ok: true, id: checkIn(parsed.data.checkin) });
    }
    if (body?.checkout) {
      const parsed = z.object({ checkout: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad checkout" }, { status: 422 });
      try {
        return NextResponse.json({ ok: true, id: checkOut(parsed.data.checkout) });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.holiday) {
      const parsed = z.object({ holiday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), name: z.string().min(1).max(120) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad holiday" }, { status: 422 });
      saveHoliday(parsed.data.holiday, parsed.data.name);
      return NextResponse.json({ ok: true });
    }
    if (body?.holidayDel) {
      deleteHoliday(String(body.holidayDel).slice(0, 10));
      return NextResponse.json({ ok: true });
    }
    if (typeof body?.shift === "string") {
      const parsed = z.object({
        shift: z.string().min(1).max(60), start: z.string().max(5).optional(), end: z.string().max(5).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad shift" }, { status: 422 });
      return NextResponse.json({ ok: true, id: saveShift({ name: parsed.data.shift, start: parsed.data.start, end: parsed.data.end }) });
    }
    if (body?.roster) {
      const parsed = z.object({
        roster: z.number().int(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), shift: z.number().int().min(0).max(1000),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad roster" }, { status: 422 });
      setRoster(parsed.data.roster, parsed.data.day, parsed.data.shift);
      return NextResponse.json({ ok: true });
    }
    if (body?.onboard) {
      const parsed = z.object({ onboard: z.number().int(), item: z.string().min(1).max(120) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad item" }, { status: 422 });
      return NextResponse.json({ ok: true, done: onboardToggle(parsed.data.onboard, parsed.data.item) });
    }
    if (body?.time) {
      const parsed = z.object({
        time: z.number().int(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        hours: z.number().min(0.1).max(24), taskRef: z.string().max(120).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad time" }, { status: 422 });
      return NextResponse.json({ ok: true, id: logTime(parsed.data.time, parsed.data.day, parsed.data.hours, parsed.data.taskRef ?? "") });
    }
    return NextResponse.json({ error: "unknown op" }, { status: 422 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
}
