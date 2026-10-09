import { VenueConsole } from "@/components/venue-console";

export const metadata = { title: "Venues" };

export default function VenuesPage() {
  return (
    <div className="wrap section max-w-4xl">
      <h1 className="text-2xl font-extrabold">Venues</h1>
      <p className="mt-1 text-sm text-zinc-500">Hotels, halls, resorts, apartments, rooms — one form, profile-driven rates.</p>
      <div className="mt-4"><VenueConsole /></div>
    </div>
  );
}
