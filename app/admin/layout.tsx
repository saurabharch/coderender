import { redirect } from "next/navigation";
import { sessionUser } from "@/lib/auth";
import { AdminDrawer } from "@/components/admin-drawer";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await sessionUser();
  if (!user) redirect("/login");
  return (
    <div className="wrap section max-w-6xl">
      <div className="gap-6 md:flex">
        <AdminDrawer email={user.email} role={user.role} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
