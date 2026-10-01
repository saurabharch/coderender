"use client";

import { DataTable, type DTRow } from "@/components/data-table";

export function OrdersTable({ rows, payments, onEdit }: {
  rows: DTRow[];
  payments: Record<string, { amount: number; method: string; status: string }[]>;
  onEdit: (id: number | string, key: string, value: string) => Promise<void>;
}) {
  return (
    <DataTable
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "title", label: "Title", editable: true },
        { key: "amount", label: "₹ Amount", type: "number", editable: true },
        { key: "status", label: "Status", type: "badge", editable: true, options: ["draft", "active", "done", "cancelled"] },
        { key: "billed", label: "₹ Billed", type: "number" },
        { key: "paid", label: "₹ Paid", type: "number" },
      ]}
      rows={rows}
      searchKeys={["title", "status"]}
      facets={[{ key: "status", label: "Status" }]}
      expand={(r) => {
        const ps = payments[String(r.id)] ?? [];
        return ps.length ? (
          <ul className="grid gap-1 text-xs">
            {ps.map((p, i) => <li key={i}>₹{p.amount} · {p.method} · {p.status}</li>)}
          </ul>
        ) : <span className="text-xs text-zinc-500">No payments yet — add one below.</span>;
      }}
      onEdit={onEdit}
      exportName="orders"
    />
  );
}
