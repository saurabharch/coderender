import type { Metadata } from "next";
import { HooksConsole } from "@/components/hooks-console";

export const metadata: Metadata = {
  title: "Webhooks — CodeRender",
  description: "Endpoint registry, signed deliveries, retries, and replay.",
};

export default function HooksAdmin() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">Webhooks</h1>
      <p className="mt-1 text-sm text-zinc-500">HMAC-signed (<code>cr-signature</code>), idempotent, retried with backoff, replayable. Verify with the endpoint secret.</p>
      <div className="mt-4"><HooksConsole /></div>
    </>
  );
}
