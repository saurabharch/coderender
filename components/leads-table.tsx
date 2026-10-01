"use client";

import { DataTable, type DTRow } from "@/components/data-table";

const STAGES = ["new", "contacted", "qualified", "won", "lost"];

export function LeadsTable({ rows, onEdit }: {
  rows: DTRow[];
  onEdit: (id: number | string, key: string, value: string) => Promise<void>;
}) {
  return (
    <DataTable
      columns={[
        { key: "id", label: "#", type: "number" },
        { key: "name", label: "Name", editable: true },
        { key: "phone", label: "Phone" },
        { key: "businessType", label: "Business", editable: true },
        { key: "source", label: "Source", type: "badge" },
        { key: "status", label: "Stage", type: "badge", editable: true, options: STAGES },
        { key: "createdAt", label: "When" },
      ]}
      rows={rows}
      searchKeys={["name", "phone", "businessType", "source"]}
      facets={[{ key: "status", label: "Stage" }, { key: "businessType", label: "Business" }, { key: "source", label: "Source" }]}
      expand={(r) => (
        <span className="grid gap-1 text-xs">
          <span><b>Message:</b> {String(r.message || "—")}</span>
          <span className="font-mono text-zinc-500">fp: {String(r.fingerprint || "—")} · #{String(r.id)}</span>
        </span>
      )}
      onEdit={async (id, key, value) => {
        await onEdit(id, key, value);
      }}
      exportName="leads"
    />
  );
}
