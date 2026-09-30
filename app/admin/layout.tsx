import { redirect } from "next/navigation";
import Link from "next/link";
import { sessionUser } from "@/lib/auth";

const NAV = [
  ["Overview", "/admin"],
  ["Leads", "/admin/leads"],
  ["Orders", "/admin/orders"],
  ["Subscribers", "/admin/subscribers"],
  ["Notify", "/admin/notify"],
  ["Partners", "/admin/partners"],
  ["Keys", "/admin/keys"],
  ["Settings", "/admin/settings"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await sessionUser();
  if (!user) redirect("/login");
  return (
    <div className="wrap section max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Admin · {user.email} ({user.role})</p>
        <form action="/api/auth/logout" method="post">
          <button className="min-h-[44px] rounded-full border border-black/15 px-4 text-sm font-semibold dark:border-white/20">Sign out</button>
        </form>
      </div>
      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Admin">
        {NAV.map(([l, h]) => (
          <Link key={h} href={h} className="inline-flex min-h-[44px] items-center rounded-full border border-black/10 px-4 text-sm font-semibold dark:border-white/15">{l}</Link>
        ))}
      </nav>
      <div className="mt-6">{children}</div>
    </div>
  );
}
