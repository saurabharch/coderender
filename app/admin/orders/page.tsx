import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";

async function createOrder(form: FormData) {
  "use server";
  getDb().prepare("INSERT INTO ClientOrder (leadId, title, amount, status) VALUES (?,?,?,?)").run(
    Number(form.get("leadId") || 0) || null,
    String(form.get("title") || "Order"),
    Number(form.get("amount") || 0),
    "draft"
  );
  revalidatePath("/admin/orders");
}

async function setStatus(form: FormData) {
  "use server";
  const id = Number(form.get("id"));
  const status = String(form.get("status"));
  if (!["draft", "active", "done", "cancelled"].includes(status)) return;
  getDb().prepare("UPDATE ClientOrder SET status=? WHERE id=?").run(status, id);
  revalidatePath("/admin/orders");
}

async function addPayment(form: FormData) {
  "use server";
  getDb().prepare("INSERT INTO Payment (orderId, amount, method, status) VALUES (?,?,?,?)").run(
    Number(form.get("orderId")), Number(form.get("amount") || 0),
    String(form.get("method") || "upi"), String(form.get("status") || "pending")
  );
  revalidatePath("/admin/orders");
}

export default async function OrdersPage() {
  const orders = getDb().prepare(
    `SELECT o.*, COALESCE((SELECT SUM(amount) FROM Payment p WHERE p.orderId=o.id AND p.status='paid'),0) paid,
     COALESCE((SELECT SUM(amount) FROM Payment p WHERE p.orderId=o.id),0) billed
     FROM ClientOrder o ORDER BY o.id DESC LIMIT 100`).all() as
    { id: number; leadId: number | null; title: string; amount: number; status: string; paid: number; billed: number }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Orders & payments</h1>
      <form action={createOrder} className="mt-4 flex flex-wrap items-end gap-2 rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <label className="grid gap-1 text-sm">Lead ID<input name="leadId" inputMode="numeric" className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <label className="grid gap-1 text-sm">Title<input name="title" required className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <label className="grid gap-1 text-sm">Amount ₹<input name="amount" inputMode="numeric" defaultValue="0" className="min-h-[44px] w-32 rounded-xl border border-black/15 bg-transparent px-3 dark:border-white/20" /></label>
        <button className="min-h-[44px] rounded-xl bg-brand px-5 text-sm font-semibold text-white">Create order</button>
      </form>
      <div className="mt-4 grid gap-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-black/10 p-4 text-sm dark:border-white/10">
            <p className="font-bold">#{o.id} {o.title} · ₹{o.amount} · {o.status} · billed ₹{o.billed} · paid ₹{o.paid}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <form action={setStatus} className="flex gap-2">
                <input type="hidden" name="id" value={o.id} />
                <select name="status" defaultValue={o.status} className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
                  {["draft", "active", "done", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Set</button>
              </form>
              <form action={addPayment} className="flex gap-2">
                <input type="hidden" name="orderId" value={o.id} />
                <input name="amount" inputMode="numeric" placeholder="₹" className="min-h-[44px] w-24 rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20" />
                <select name="method" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
                  <option value="upi">UPI</option><option value="cash">Cash</option><option value="card">Card</option>
                </select>
                <select name="status" className="min-h-[44px] rounded-xl border border-black/15 bg-transparent px-2 dark:border-white/20">
                  <option value="pending">Pending</option><option value="paid">Paid</option>
                </select>
                <button className="min-h-[44px] rounded-xl border border-black/15 px-3 dark:border-white/20">Add payment</button>
              </form>
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-sm text-zinc-500">No orders yet — create one from a lead above.</p>}
      </div>
    </>
  );
}
