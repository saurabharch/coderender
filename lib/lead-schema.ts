import { z } from "zod";

export const leadSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(7).max(20),
  businessType: z.string().min(2).max(60).default("general"),
  source: z.string().min(2).max(60).default("contact"),
  message: z.string().max(1000).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;
