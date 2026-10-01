import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/store";
import { requireTeam } from "@/lib/auth";
import { LeadsTable } from "@/components/leads-table";

const EDITABLE = ["name", "businessType", "status"] as const;
const STAGES = ["new", "contacted", "qualified", "won", "lost"];

async function editLead(id: number | string, key: string, value: string) {
  "use server";
  await requireTeam();
  if (!(EDITABLE as readonly string[]).includes(key)) return;
  const v = String(value).slice(0, 120);
  if (key === "status" && !STAGES.includes(v)) return;
  if (key === "name" && v.trim().length < 2) return;
  getDb().prepare(`UPDATE Lead SET ${key}=? WHERE id=?`).run(v, Number(id));
  revalidatePath("/admin/leads");
}

export default async function LeadsPage() {
  const rows = getDb().prepare("SELECT * FROM Lead ORDER BY id DESC LIMIT 200").all() as
    { id: number; name: string; phone: string; businessType: string; source: string; status: string; message: string; fingerprint: string | null; createdAt: string }[];
  return (
    <>
      <h1 className="text-2xl font-extrabold">Leads ({rows.length})</h1>
      <div className="mt-4">
        <LeadsTable
          rows={rows.map((r) => ({ ...r, status: r.status || "new", createdAt: r.createdAt.slice(0, 16).replace("T", " ") }))}
          onEdit={editLead}
        />
      </div>
    </>
  );
}
