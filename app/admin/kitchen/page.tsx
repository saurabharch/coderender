import { KitchenBoard } from "@/components/kitchen-board";

export const metadata = { title: "Kitchen display" };

export default function KitchenPage() {
  return (
    <div className="wrap section max-w-6xl">
      <h1 className="text-2xl font-extrabold">Kitchen display</h1>
      <p className="mt-1 text-sm text-zinc-500">Open tickets, oldest first — refreshes every 15 seconds.</p>
      <div className="mt-4"><KitchenBoard /></div>
    </div>
  );
}
