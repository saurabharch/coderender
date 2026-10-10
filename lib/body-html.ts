import sanitizeHtml from "sanitize-html";

// Body rendering contract: legacy plain-text bodies render as-is;
// tiptap HTML bodies render sanitized. Never trust stored markup.
export function isHtmlBody(body: string): boolean {
  return /^\s*</.test(body);
}

const ALLOWED = {
  allowedTags: [
    "p", "h1", "h2", "h3", "strong", "em", "u", "s", "ul", "ol", "li",
    "blockquote", "code", "pre", "a", "img", "br", "hr",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  allowRelativeUrls: true,
};

export function cleanBody(html: string): string {
  return sanitizeHtml(html, ALLOWED);
}

/** Plain-text excerpt helper shared by cards (strips tags, trims). */
export function plainExcerpt(body: string, max = 140): string {
  const text = isHtmlBody(body)
    ? sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} })
    : body;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** Rough read time in minutes (200 wpm, min 1). */
export function readMinutes(body: string): number {
  const words = plainExcerpt(body, 100000).split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
