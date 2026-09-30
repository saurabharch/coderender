import { sessionUser } from "@/lib/auth";
import { getDb } from "@/lib/store";
import { LiveNotices } from "@/components/live-notices";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const user = await sessionUser();
  if (!user) redirect("/login");
  const orgs = getDb().prepare(
    "SELECT o.name, m.role FROM Membership m JOIN Org o ON o.id=m.orgId WHERE m.userId=?").all(user.id) as
    { name: string; role: string }[];
  const notifs = getDb().prepare(
    "SELECT title, body, createdAt FROM Notification WHERE audience IN ('team','all') ORDER BY id DESC LIMIT 10").all() as
    { title: string; body: string; createdAt: string }[];
  return (
    <div className="wrap section max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Team</p>
      <h1 className="display-1 mt-2">Account</h1>
      <div className="mt-4 rounded-2xl border border-black/10 p-5 text-sm dark:border-white/10">
        <p><b>{user.email}</b> · role {user.role}</p>
        <ul className="mt-2">
          {orgs.map((o) => <li key={o.name}>{o.name} — {o.role}</li>)}
        </ul>
        <form action="/api/auth/logout" method="post" className="mt-3">
          <button className="min-h-[44px] rounded-full border border-black/15 px-5 text-sm font-semibold dark:border-white/20">Sign out</button>
        </form>
      </div>
      <h2 className="mt-6 font-bold">Team notices</h2>
      <LiveNotices initial={notifs} />
    </div>
  );
}
