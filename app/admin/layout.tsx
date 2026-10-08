import { redirect } from "next/navigation";
import { impersonator, sessionUser } from "@/lib/auth";
import { AdminDrawer } from "@/components/admin-drawer";
import { MantineShell } from "@/components/mantine-shell";
import { StaffQuickBar } from "@/components/staff-quickbar";
import { BrandTheme } from "@/components/brand-theme";

async function stopImpersonate() {
  "use server";
  const { impersonator, stopImpersonation } = await import("@/lib/auth");
  const imp = await impersonator();
  if (!imp) return;
  const { cookies } = await import("next/headers");
  const { redirect } = await import("next/navigation");
  const jar = await cookies();
  try {
    stopImpersonation(jar.get("cr_session")?.value, imp.token);
  } catch {
    return;
  }
  jar.set("cr_session", imp.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  jar.delete("cr_imp");
  const { audit } = await import("@/lib/scale");
  audit(imp.email, "impersonate.stop", "", "");
  redirect("/admin/settings");
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await sessionUser();
  if (!user) redirect("/login");
  const imp = await impersonator();
  return (
    <div className="wrap section max-w-6xl">
      {imp && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brand/40 bg-brand/10 px-4 py-2 text-sm">
          <span>👁 Viewing as <b>{user.email}</b> ({user.role}) — owner: {imp.email}</span>
          <form action={stopImpersonate}>
            <button className="min-h-[44px] rounded-xl bg-brand px-4 text-sm font-semibold text-white">Stop impersonating</button>
          </form>
        </div>
      )}
      <div className="gap-6 md:flex">
        <AdminDrawer email={user.email} role={user.role} />
        <div className="min-w-0 flex-1"><MantineShell>{children}<StaffQuickBar /><BrandTheme admin /></MantineShell></div>
      </div>
    </div>
  );
}
