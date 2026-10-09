import { BookFlow } from "@/components/book-flow";

export const metadata = {
  title: "Book a venue",
  description: "Check availability and book halls, rooms, resorts, and apartments online — pay at the venue.",
};

export default function BookPage() {
  return (
    <div className="wrap section max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Online booking</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Book your date</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Halls, rooms, resorts, apartments — live availability, instant hold, pay at the venue.</p>
      <div className="mt-6"><BookFlow /></div>
    </div>
  );
}
