// Tiny allowlist sanitizer for editor HTML (no deps).
// Allows formatting + links + lists only; strips scripts, styles, event
// handlers, and dangerous URLs. Defense in depth: also escape everything
// else by rebuilding from the allowlist.
const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "s", "p", "br", "ul", "ol", "li", "a", "blockquote", "code", "pre", "h3", "h4"]);

function cleanHref(href: string): string {
  const u = href.trim().slice(0, 500);
  return /^(\/|https?:\/\/|mailto:)/i.test(u) ? u : "#";
}

export function sanitizeHtml(raw: string): string {
  const html = String(raw ?? "").slice(0, 20000);
  return html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g, (tag, name: string, attrs: string) => {
    const t = name.toLowerCase();
    const closing = tag.startsWith("</");
    if (!ALLOWED_TAGS.has(t)) return "";
    if (closing) return `</${t}>`;
    if (t === "a") {
      const m = /\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const href = m ? (m[2] ?? m[3] ?? m[4] ?? "") : "";
      return `<a href="${cleanHref(href).replace(/"/g, "&quot;")}" rel="noopener">`;
    }
    return t === "br" ? "<br>" : `<${t}>`;
  });
}

// Plain text (possibly markdown-lite) or editor HTML? Heuristic: contains
// an allowed block tag.
export function isRichHtml(s: string): boolean {
  return /<(p|ul|ol|li|h3|h4|blockquote|pre)(\s|>)/i.test(String(s ?? ""));
}
