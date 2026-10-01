// Pure media helpers (no sqlite import — safe for vitest).

export const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
export const MAX_BYTES = 2 * 1024 * 1024;

export function isAllowedMime(mime: string): boolean {
  if (ALLOWED_MIME.includes(mime)) return true;
  return mime === "application/pdf";
}

export function publicUrl(a: { filename: string; url: string }): string {
  return a.url || (a.filename ? `/uploads/${a.filename}` : "");
}
