import { startScheduler } from "@/lib/scheduler";

export async function GET() {
  startScheduler();
  return new Response("scheduler on", { headers: { "Content-Type": "text/plain" } });
}
