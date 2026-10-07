import { NextResponse } from "next/server";
import { z } from "zod";
import { addGoal, applyStructure, checkIn, checkOut, closeExit, closeCycle, completeReview, createCycle, cycleDetail, deleteHoliday, empTimeline, exitCase, fileExit, fileExpense, fullFinal, getRun, leaveBalances, listDesignations, listExpenses, listHolidays, listLeaves, listOffers, hrReports, listRuns, listShifts, listStructures, logEmpEvent, logTime, makeOffer, markAttendance, monthAttendance, onboardList, onboardToggle, openRun, payRun, payslip, requestLeave, saveDesignation, submitReview, saveHoliday, saveShift, saveStructure, setClearance, setExpense, setLeave, setOffer, setRoster, setRunStatus, todayPresence, weekOvertime, weekRoster, weekHours } from "@/lib/people";
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
  if (url.searchParams.get("expenses") !== null) {
    return NextResponse.json({ expenses: listExpenses(url.searchParams.get("expenses") || "") });
  }
  if (url.searchParams.get("designations") !== null) {
    return NextResponse.json({ designations: listDesignations() });
  }
  if (url.searchParams.get("offers") !== null) {
    return NextResponse.json({ offers: listOffers() });
  }
  if (url.searchParams.get("timeline") !== null) {
    return NextResponse.json({ timeline: empTimeline(Number(url.searchParams.get("timeline") || 0)) });
  }
  if (url.searchParams.get("exit") !== null) {
    return NextResponse.json({ exit: exitCase(Number(url.searchParams.get("exit") || 0)) });
  }
  if (url.searchParams.get("fullfinal") !== null) {
    try {
      return NextResponse.json(fullFinal(Number(url.searchParams.get("fullfinal") || 0)));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
    }
  }
  if (url.searchParams.get("structures") !== null) {
    return NextResponse.json({ structures: listStructures() });
  }
  if (url.searchParams.get("runs") !== null) {
    return NextResponse.json({ runs: listRuns() });
  }
  if (url.searchParams.get("payslip") !== null && url.searchParams.get("emp")) {
    try {
      return NextResponse.json(payslip(Number(url.searchParams.get("payslip") || 0), Number(url.searchParams.get("emp") || 0)));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
    }
  }
  if (url.searchParams.get("hrreport") !== null) {
    try {
      return NextResponse.json(hrReports(url.searchParams.get("hrreport") || new Date().toISOString().slice(0, 7)));
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
    }
  }
  if (url.searchParams.get("cycles") !== null) {
    const { listCycles } = await import("@/lib/people");
    return NextResponse.json({ cycles: listCycles() });
  }
  if (url.searchParams.get("cycle") !== null) {
    return NextResponse.json(cycleDetail(Number(url.searchParams.get("cycle") || 0)));
  }
  if (url.searchParams.get("overtime") !== null) {
    return NextResponse.json(weekOvertime(Number(url.searchParams.get("overtime") || 0), url.searchParams.get("from") || new Date().toISOString().slice(0, 10)));
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
    if (body?.expense) {
      const parsed = z.object({
        expense: z.number().int(), head: z.string().min(1).max(120), amount: z.number().min(1).max(100000000),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad expense" }, { status: 422 });
      return NextResponse.json({ ok: true, id: fileExpense(parsed.data.expense, parsed.data.head, parsed.data.amount) });
    }
    if (body?.expenseTo) {
      const parsed = z.object({ expenseTo: z.string().min(1).max(20), expenseId: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad transition" }, { status: 422 });
      try {
        setExpense(parsed.data.expenseId, parsed.data.expenseTo);
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.offer) {
      const parsed = z.object({
        offer: z.string().min(1).max(120), email: z.string().max(120).optional(),
        designation: z.string().max(80).optional(), ctc: z.number().min(0).max(1000000000).optional(),
        joining: z.string().max(10).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad offer" }, { status: 422 });
      return NextResponse.json({ ok: true, id: makeOffer({ name: parsed.data.offer, ...parsed.data }) });
    }
    if (body?.offerTo) {
      const parsed = z.object({ offerTo: z.enum(["accepted", "declined", "withdrawn"]), offerId: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad decision" }, { status: 422 });
      try {
        return NextResponse.json({ ok: true, employeeId: setOffer(parsed.data.offerId, parsed.data.offerTo) });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.designation) {
      const parsed = z.object({ designation: z.string().min(1).max(80), grade: z.string().max(20).optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad designation" }, { status: 422 });
      saveDesignation(parsed.data.designation, parsed.data.grade ?? "");
      return NextResponse.json({ ok: true });
    }
    if (body?.empEvent) {
      const parsed = z.object({ empEvent: z.number().int(), kind: z.string().max(20), detail: z.string().max(300).optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad event" }, { status: 422 });
      logEmpEvent(parsed.data.empEvent, parsed.data.kind, parsed.data.detail ?? "");
      return NextResponse.json({ ok: true });
    }
    if (body?.resign) {
      const parsed = z.object({ resign: z.number().int(), reason: z.string().max(200).optional(), lastDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad resignation" }, { status: 422 });
      try {
        fileExit(parsed.data.resign, parsed.data.reason ?? "", parsed.data.lastDay);
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.clear) {
      const parsed = z.object({ clear: z.number().int(), key: z.string().min(1).max(40), done: z.boolean() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad clearance" }, { status: 422 });
      try {
        setClearance(parsed.data.clear, parsed.data.key, parsed.data.done);
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.closeExit) {
      const parsed = z.object({ closeExit: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad close" }, { status: 422 });
      try {
        closeExit(parsed.data.closeExit);
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.runstate) {
      const parsed = z.object({ runstate: z.number().int(), to: z.enum(["reviewed", "approved", "locked"]) }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad transition" }, { status: 422 });
      try {
        setRunStatus(parsed.data.runstate, parsed.data.to);
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.structure) {
      const parsed = z.object({
        structure: z.string().min(1).max(80), base: z.number().min(0).max(100000000),
        allowances: z.number().min(0).max(100000000).optional(), deductions: z.number().min(0).max(100000000).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad structure" }, { status: 422 });
      return NextResponse.json({ ok: true, id: saveStructure(parsed.data.structure, parsed.data.base, parsed.data.allowances ?? 0, parsed.data.deductions ?? 0) });
    }
    if (body?.applyStruct) {
      const parsed = z.object({ applyStruct: z.number().int(), employeeId: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad apply" }, { status: 422 });
      try {
        applyStructure(parsed.data.employeeId, parsed.data.applyStruct);
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.cycle) {
      const parsed = z.object({ cycle: z.string().min(1).max(120), period: z.string().max(20).optional() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad cycle" }, { status: 422 });
      return NextResponse.json({ ok: true, id: createCycle(parsed.data.cycle, parsed.data.period ?? "") });
    }
    if (body?.cycleClose) {
      closeCycle(Number(body.cycleClose));
      return NextResponse.json({ ok: true });
    }
    if (body?.goal) {
      const parsed = z.object({
        goal: z.number().int(), employeeId: z.number().int(), title: z.string().min(1).max(200), weight: z.number().min(1).max(5).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad goal" }, { status: 422 });
      return NextResponse.json({ ok: true, id: addGoal(parsed.data.goal, parsed.data.employeeId, parsed.data.title, parsed.data.weight ?? 1) });
    }
    if (body?.review) {
      const parsed = z.object({
        review: z.number().int(), employeeId: z.number().int(), rating: z.number().min(1).max(5), notes: z.string().max(1000).optional(),
      }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad review" }, { status: 422 });
      try {
        submitReview(parsed.data.review, parsed.data.employeeId, parsed.data.rating, parsed.data.notes ?? "");
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
    }
    if (body?.reviewDone) {
      const parsed = z.object({ reviewDone: z.number().int(), employeeId: z.number().int() }).safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "bad complete" }, { status: 422 });
      try {
        completeReview(parsed.data.reviewDone, parsed.data.employeeId);
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
      }
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
