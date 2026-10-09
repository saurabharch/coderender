import { DineConsole } from "@/components/dine-console";

export const metadata = { title: "Dine floor" };

export default function DinePage() {
  return (
    <div className="wrap section max-w-4xl">
      <h1 className="text-2xl font-extrabold">Dine floor</h1>
      <p className="mt-1 text-sm text-zinc-500">Tables, captains and servers — fire tickets to the kitchen display.</p>
      <div className="mt-4"><DineConsole /></div>
    </div>
  );
}
