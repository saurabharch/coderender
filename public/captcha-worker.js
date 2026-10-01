/**
 * Captcha proof-of-work worker (devcaptcha protocol, adapted).
 * Message in:  { challenges: string[], leadingZerosLength: number }
 * Messages out: { type: 'next', solved, total } … { type: 'success', arr }
 * where arr = [{ challenge, prefix }]. Served from /captcha-worker.js so any
 * page can mine without blocking its UI thread.
 */
async function sha256hex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

self.onmessage = async (event) => {
  const { challenges, leadingZerosLength } = event.data || {};
  const arr = [];
  for (const challenge of challenges || []) {
    let prefix = 0;
    for (;;) {
      const answer = await sha256hex(prefix + challenge);
      if (answer.startsWith("0".repeat(leadingZerosLength))) {
        arr.push({ challenge, prefix });
        self.postMessage({ type: "next", solved: arr.length, total: challenges.length });
        break;
      }
      prefix++;
    }
  }
  self.postMessage({ type: "success", arr });
};
