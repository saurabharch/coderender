// UI-builder layer registry (pure data + sanitizers; rendering lives in
// components/layer-renderer.tsx so server components stay light).
export const LAYER_TYPES = [
  { type: "hero", label: "Hero", props: ["title", "body"] },
  { type: "features", label: "Feature grid", props: ["title", "body"] },
  { type: "cards", label: "Link cards", props: ["title", "items"] },
  { type: "image", label: "Image", props: ["image", "title"] },
  { type: "markdown", label: "Rich text", props: ["body"] },
  { type: "stats", label: "Stat band", props: ["items"] },
  { type: "cta", label: "CTA", props: ["title", "body", "link"] },
  { type: "faq", label: "FAQ", props: ["title", "body"] },
  { type: "divider", label: "Divider", props: [] },
  { type: "spacer", label: "Spacer", props: [] },
  { type: "text", label: "Text", props: ["title", "body"] },
] as const;

export type LayerType = (typeof LAYER_TYPES)[number]["type"];

export function isLayerType(t: unknown): t is LayerType {
  return (LAYER_TYPES as readonly { type: string }[]).some((x) => x.type === t);
}

export interface LayerProps {
  title?: string;
  body?: string;
  image?: string;
  link?: string;
  items?: { label: string; href?: string; value?: string }[];
}

// items lines: "Label | /href" or "Label | value" or plain "Label".
export function parseItems(body: string): LayerProps["items"] {
  return body.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 12).map((l) => {
    const [label, rest] = l.split("|").map((s) => s.trim());
    if (!rest) return { label: label.slice(0, 80) };
    if (/^(\/|https?:)/.test(rest)) return { label: label.slice(0, 80), href: rest.slice(0, 300) };
    return { label: label.slice(0, 80), value: rest.slice(0, 80) };
  });
}

export function sanitizeProps(type: string, raw: Record<string, unknown>): LayerProps {
  const out: LayerProps = {};
  const str = (v: unknown, n: number) => String(v ?? "").slice(0, n);
  if (["hero", "features", "cards", "cta", "faq", "text", "image"].includes(type) && raw.title !== undefined)
    out.title = str(raw.title, 160);
  if (["hero", "features", "cta", "faq", "text", "markdown"].includes(type) && raw.body !== undefined)
    out.body = str(raw.body, 8000);
  if (type === "image" && raw.image !== undefined) {
    const u = str(raw.image, 500);
    if (/^(\/|https?:\/\/)/.test(u)) out.image = u;
  }
  if (type === "cta" && raw.link !== undefined) {
    const u = str(raw.link, 300);
    if (/^(\/|https?:\/\/)/.test(u)) out.link = u;
  }
  if ((type === "cards" || type === "stats") && raw.body !== undefined)
    out.items = parseItems(str(raw.body, 4000));
  return out;
}

// Variables: {{siteName}} {{phone}} {{year}} + page vars (page scope wins).
export function resolveVars(text: string, pageVars: Record<string, string> = {}): string {
  const site: Record<string, string> = {
    siteName: "CodeRender",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
    year: String(new Date().getFullYear()),
  };
  return String(text ?? "").replace(/\{\{(\w+)\}\}/g, (_, k: string) =>
    pageVars[k] ?? site[k] ?? `{{${k}}}`);
}

export function pageVars(rows: { name: string; value: string }[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.name, r.value]));
}
