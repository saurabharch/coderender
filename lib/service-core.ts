// Pure service-ops math (no sqlite — safe for vitest).

export const JOB_FLOW: Record<string, string[]> = {
  booked: ["assigned", "cancelled"],
  assigned: ["in-progress", "cancelled"],
  "in-progress": ["done", "cancelled"],
  done: ["invoiced"],
  invoiced: [],
  cancelled: [],
};

export function jobCan(from: string, to: string): boolean {
  return (JOB_FLOW[from] ?? []).includes(to);
}

// {{var}} template render (print templates, job cards, receipts).
export function renderTemplate(body: string, vars: Record<string, string>): string {
  let out = body.slice(0, 8000);
  for (const [k, v] of Object.entries(vars)) out = out.split(`{{${k}}}`).join(v.slice(0, 500));
  // Drop unfilled variables rather than printing {{mystery}}.
  return out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");
}

export function jobNumber(id: number, date = new Date()): string {
  return `JOB-${date.getFullYear()}-${String(id).padStart(4, "0")}`;
}
