import type { Metadata } from "next";
import { FlowBuilder } from "@/components/flow-builder";

export const metadata: Metadata = {
  title: "Workflow Builder — CodeRender",
  description: "Visual multi-channel workflows: triggers, channel steps, kill switches.",
};

export default function FlowsAdmin() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Workflow builder</h1>
      <p className="mt-1 text-sm text-zinc-500">Triggers fire on ticket/lead events or manually. Steps send on WhatsApp, email, Telegram, Slack — any channel can be killed instantly.</p>
      <div className="mt-4"><FlowBuilder /></div>
    </>
  );
}
