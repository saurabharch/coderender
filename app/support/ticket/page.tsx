import type { Metadata } from "next";
import { TicketForm } from "./form";

export const metadata: Metadata = {
  title: "Raise a Ticket — CodeRender",
  description: "File a CodeRender support ticket. Tracked with a human reply in one business day.",
  keywords: ["raise ticket", "support ticket", "coderender help"],
};

export default function TicketPage() {
  return (
    <div className="wrap section max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-deep">Support</p>
      <h1 className="display-1 mt-1">Raise a ticket</h1>
      <p className="mt-2 text-sm text-zinc-500">Tracked in our system — a human replies within one business day (Mon–Sat). For fraud, start the subject with “FRAUD:”.</p>
      <div className="mt-4"><TicketForm /></div>
    </div>
  );
}
