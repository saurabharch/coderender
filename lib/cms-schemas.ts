import { z } from "zod";

// Field rendering hints live in FIELD_UI (zod 3 has no .meta()), keyed type.field.
export const FIELD_UI: Record<string, {
  fieldType?: "textarea" | "switch" | "select" | "radio" | "file" | "relation";
  description?: string;
  placeholder?: string;
  relation?: { type: "belongsTo"; targetType: string; displayField: string };
}> = {
  "announcement.text": { description: "Banner text", placeholder: "Offer or notice…" },
  "announcement.link": { description: "Optional link target" },
  "announcement.active": { fieldType: "switch", description: "Show in header banner" },
  "page.body": { fieldType: "textarea", description: "Plain paragraphs" },
  "page.cover": { fieldType: "file", description: "Optional cover image (upload or URL)" },
  "page.published": { fieldType: "switch" },
  "faq.answer": { fieldType: "textarea" },
  "faq.topic": { description: "Where it can appear" },
  "faq.published": { fieldType: "switch" },
  "highlight.body": { fieldType: "textarea" },
  "highlight.image": { fieldType: "file", description: "Card image (upload or URL)" },
  "highlight.icon": { description: "Glyph key" },
  "highlight.published": { fieldType: "switch" },
  "category.blurb": { fieldType: "textarea" },
  "testimonial.quote": { fieldType: "textarea" },
  "testimonial.categoryId": { fieldType: "relation", relation: { type: "belongsTo", targetType: "category", displayField: "name" } },
  "testimonial.published": { fieldType: "switch" },
};

export const AnnouncementSchema = z.object({
  text: z.string().min(1).max(300),
  link: z.string().max(200).default(""),
  active: z.boolean().default(true),
});

export const PageSchema = z.object({
  title: z.string().min(1).max(160),
  body: z.string().max(20000),
  cover: z.string().max(300).default(""),
  published: z.boolean().default(false),
});

export const FaqSchema = z.object({
  question: z.string().min(1).max(200),
  answer: z.string().min(1).max(2000),
  topic: z.enum(["general", "pricing", "services", "support"]),
  published: z.boolean().default(true),
});

export const HighlightSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().max(500),
  image: z.string().max(300).default(""),
  icon: z.enum(["star", "zap", "shield", "chat"]),
  link: z.string().max(200).default(""),
  published: z.boolean().default(true),
});

export const CategorySchema = z.object({
  name: z.string().min(1).max(80),
  blurb: z.string().max(300).default(""),
});

export const TestimonialTypeSchema = z.object({
  name: z.string().min(1).max(80),
  business: z.string().max(120).default(""),
  quote: z.string().min(1).max(1000),
  categoryId: z.object({ id: z.coerce.string() }).optional(),
  published: z.boolean().default(false),
});

export const CONTENT_TYPES = [
  { name: "Announcement", slug: "announcement", description: "Header banner lines" },
  { name: "Page", slug: "page", description: "Standalone text pages" },
  { name: "FAQ", slug: "faq", description: "Q&A bank" },
  { name: "Highlight", slug: "highlight", description: "Homepage feature cards" },
  { name: "Category", slug: "category", description: "Testimonial groupings" },
  { name: "Testimonial", slug: "testimonial", description: "Customer proof (typed)" },
] as const;

export type ContentSlug = (typeof CONTENT_TYPES)[number]["slug"];

const SCHEMAS: Record<string, z.ZodTypeAny> = {
  announcement: AnnouncementSchema,
  page: PageSchema,
  faq: FaqSchema,
  highlight: HighlightSchema,
  category: CategorySchema,
  testimonial: TestimonialTypeSchema,
};

export function schemaFor(slug: string): z.ZodTypeAny | null {
  return SCHEMAS[slug] ?? null;
}
