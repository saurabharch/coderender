import type { Metadata } from "next";
import { WaInbox } from "@/components/wa-inbox";

export const metadata: Metadata = {
  title: "WhatsApp Inbox — CodeRender",
  description: "Team WhatsApp conversations, replies, and templates.",
};

export default function WhatsAppAdmin() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">WhatsApp inbox</h1>
      <p className="mt-1 text-sm text-zinc-500">Inbound lands here live. Angry contacts auto-file tickets. STOP is always respected.</p>
      <div className="mt-4"><WaInbox /></div>
    </>
  );
}
