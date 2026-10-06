"use client";

import { CopyBtn, StatusBadge, IconBtn } from "@/components/admin-ux";
import { maskInt } from "@/lib/mask";
import { maskAmount, maskUpi } from "@/lib/mask";

import { Plus } from "lucide-react"
import { useEffect, useState } from "react";
import { AdminCard, Empty, Skeleton } from "@/components/admin-ui";

interface Bill { id: number; no: string; type: string; grand: number; status: string }
interface Acct { id: number; name: string; kind: string; balance: number }
interface Expense { id: number; head: string; amount: number; status: string }

export function BillingConsole() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [accts, setAccts] = useState<Acct[]>([]);
  const [exps, setExps] = useState<Expense[]>([]);
  const [pnl, setPnl] = useState<{ sales: number; expenses: number; wages: number; profit: number } | null>(null);
  const [qrs, setQrs] = useState<{ id: number; upiId: string; label: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [oid, setOid] = useState("");
  const [head, setHead] = useState("");
  const [amt, setAmt] = useState("");
  const [upiId, setUpiId] = useState("");

  async function load() {
    const [b, a, e, p, q] = await Promise.all([
      fetch("/api/billing/docs").then((r) => r.json()).catch(() => null),
      fetch("/api/billing/accounts").then((r) => r.json()).catch(() => null),
      fetch("/api/billing/money").then((r) => r.json()).catch(() => null),
      fetch("/api/finance?view=pnl").then((r) => r.json()).catch(() => null),
      fetch("/api/pay/link?qr=1").then((r) => r.json()).catch(() => null),
    ]);
    if (b?.bills) setBills(b.bills);
    if (a?.accounts) setAccts(a.accounts);
    if (e?.expenses) setExps(e.expenses);
    if (p && typeof p.sales === "number") setPnl(p);
    if (q?.qrs) setQrs(q.qrs);
    setLoaded(true);
  }

  useEffect(() => { void load(); }, []);

  async function fromOrder() {
    const res = await fetch("/api/billing/docs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: Number(oid), type: "invoice" }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Billed ${d.no} ✓` : (d.error ?? "bill failed"));
    if (res.ok) { setOid(""); void load(); }
  }

  async function billStatus(id: number, to: string) {
    const res = await fetch("/api/billing/docs", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, to }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `${to} ✓` : (d.error ?? "failed"));
    if (res.ok) void load();
  }

  async function addExpense() {
    const res = await fetch("/api/billing/money", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ what: "expense", head, amount: Math.round(Number(amt) * 100) }),
    });
    setMsg(res.ok ? "Expense logged ✓" : "add failed");
    if (res.ok) { setHead(""); setAmt(""); void load(); }
  }

  async function payExpense(id: number) {
    const res = await fetch("/api/billing/money", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ what: "expense-status", id, to: "paid" }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "Paid ✓" : (d.error ?? "failed"));
    if (res.ok) void load();
  }

  async function saveQr() {
    const res = await fetch("/api/pay/link", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qr: true, upiId }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? "QR saved ✓" : (d.error ?? "failed"));
    if (res.ok) { setUpiId(""); void load(); }
  }

  if (!loaded) return <Skeleton lines={5} />;
  return (
    <div className="grid gap-3">
      <AdminCard>
        <p className="font-bold">Bill an order <span className="text-xs font-normal text-zinc-500">(order id → numbered invoice)</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={oid} onChange={(e) => setOid(maskInt(e.target.value))} placeholder="Order id" inputMode="numeric"
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <button onClick={() => void fromOrder()} disabled={!oid}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Invoice</button>
        </div>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Bills ({bills.length})</p>
        {bills.length === 0 ? <div className="mt-2"><Empty>No bills yet.</Empty></div> : (
          <ul className="mt-2 space-y-1 text-sm">
            {bills.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span className="flex flex-wrap items-center gap-1.5">{b.no} · ₹{(b.grand / 100).toFixed(0)} · <StatusBadge status={b.status} /></span>
                <span className="flex gap-1">
                  <a href={`/admin/billing/${b.id}/print`} className="flex min-h-[44px] items-center rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Print</a>
                  {b.status === "draft" && <button onClick={() => void billStatus(b.id, "sent")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Send→ledger</button>}
                  {b.status === "sent" && <button onClick={() => void billStatus(b.id, "paid")} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Paid</button>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">P&amp;L {pnl && <span className="text-xs font-normal text-zinc-500">(collected − expenses − wages)</span>}</p>
        {pnl ? (
          <p className="mt-1 text-sm">Sales ₹{(pnl.sales / 100).toFixed(0)} · Expenses ₹{(pnl.expenses / 100).toFixed(0)} · Wages ₹{(pnl.wages / 100).toFixed(0)} · <b>Profit ₹{(pnl.profit / 100).toFixed(0)}</b></p>
        ) : <p className="mt-1 text-sm text-zinc-500">Loading…</p>}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">UPI QR codes ({qrs.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={upiId} onChange={(e) => setUpiId(maskUpi(e.target.value))} placeholder="merchant@upi" maxLength={60}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <CopyBtn value={upiId} label="UPI ID" />
          <button onClick={() => void saveQr()} disabled={!upiId.includes("@")}
            className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-40">Save</button>
        </div>
        {qrs.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5 font-mono text-xs">
            {qrs.map((q) => <li key={q.id} className="flex items-center gap-1 rounded-full border border-black/15 py-1.5 pl-3 pr-1.5 dark:border-white/20">{q.upiId}{q.label ? ` · ${q.label}` : ""} <CopyBtn value={q.upiId} label="UPI ID" /></li>)}
          </ul>
        )}
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Accounts</p>
        <ul className="mt-2 flex flex-wrap gap-1.5 text-sm">
          {accts.map((a) => (
            <li key={a.id} className="rounded-full border border-black/15 px-3 py-1.5 dark:border-white/20">
              {a.name} · ₹{(a.balance / 100).toFixed(0)}
            </li>
          ))}
        </ul>
      </AdminCard>
      <AdminCard>
        <p className="font-bold">Log expense</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <input value={head} onChange={(e) => setHead(e.target.value)} placeholder="Head (rent, fuel…)" maxLength={80}
            className="min-h-[44px] min-w-[140px] flex-1 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <input value={amt} onChange={(e) => setAmt(maskAmount(e.target.value))} placeholder="₹" inputMode="decimal"
            className="min-h-[44px] w-28 rounded-xl border border-black/15 bg-transparent px-3 text-sm dark:border-white/20" />
          <IconBtn label="Add" onClick={() => void addExpense()} disabled={!head.trim() || !amt} tone="brand"><Plus size={20} /></IconBtn>
        </div>
        {exps.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {exps.slice(0, 8).map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 px-3 py-2 dark:border-white/10">
                <span>{x.head} · ₹{(x.amount / 100).toFixed(0)} · {x.status}</span>
                {x.status !== "paid" && (
                  <button onClick={() => void payExpense(x.id)} className="min-h-[44px] rounded-xl border border-black/15 px-3 text-xs font-semibold dark:border-white/20">Pay</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
      {msg && <p className="text-sm text-zinc-500">{msg}</p>}
    </div>
  );
}
