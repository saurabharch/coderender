import { serve } from "inngest/next";
import { inngest, functions } from "@/lib/jobs";

// Documented serve export. Local execution works with INNGEST_DEV=1 (see .env);
// Inngest Cloud takes over when INNGEST_EVENT_KEY/SIGNING_KEY are set.
// On-device job bodies always run through lib/jobs.ts runLocal().
export const { GET, POST, PUT } = serve({ client: inngest, functions });
