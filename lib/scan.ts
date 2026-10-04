// Attachment scanning: ClamAV when present (daemon socket, then binary),
// otherwise an EICAR + executable-content heuristic. The backend used is
// always recorded per file, so teams can see what cleared what — install
// clamav + freshclam (or set CLAMAV_SOCKET) to upgrade automatically.
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export type ScanBackend = "clamd" | "clamscan" | "heuristic";
export type ScanVerdict = "clean" | "infected";

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

function heuristic(buf: Buffer, mime: string): { verdict: ScanVerdict; detail: string } {
  const text = buf.slice(0, 1024 * 1024).toString("binary");
  if (text.includes(EICAR)) return { verdict: "infected", detail: "EICAR test signature" };
  const head = buf.slice(0, 4).toString("binary");
  const isExe = head.startsWith("MZ") || head.startsWith("\x7fELF");
  if (isExe) return { verdict: "infected", detail: "executable content rejected" };
  if (mime.startsWith("image/") && !/^(image\/(png|jpeg|webp|gif|svg\+xml))/.test(mime))
    return { verdict: "infected", detail: "unsupported image type" };
  return { verdict: "clean", detail: "heuristic pass" };
}

function clamdScan(path: string, socket: string): Promise<{ verdict: ScanVerdict; detail: string } | null> {
  return new Promise((resolve) => {
    (async () => {
      try {
        const net = await import("node:net");
        const sock = net.createConnection(socket);
        const timer = setTimeout(() => { sock.destroy(); resolve(null); }, 15000);
        let out = "";
        sock.on("connect", () => sock.end("SCAN " + path + "\n"));
        sock.on("data", (d: Buffer) => { out += d.toString(); });
        sock.on("end", () => {
          clearTimeout(timer);
          if (/OK$/.test(out.trim())) resolve({ verdict: "clean", detail: "clamd OK" });
          else if (/FOUND/.test(out)) resolve({ verdict: "infected", detail: out.trim().slice(0, 200) });
          else resolve(null);
        });
        sock.on("error", () => { clearTimeout(timer); resolve(null); });
      } catch {
        resolve(null);
      }
    })();
  });
}

function clamscanBin(path: string): Promise<{ verdict: ScanVerdict; detail: string } | null> {
  return new Promise((resolve) => {
    execFile("clamscan", ["--no-summary", path], { timeout: 60000 }, (err, stdout) => {
      const out = String(stdout || "");
      if (err && (err as NodeJS.ErrnoException).code === "ENOENT") return resolve(null);
      if (/OK$/.test(out.trim())) return resolve({ verdict: "clean", detail: "clamscan OK" });
      if (/FOUND/.test(out)) return resolve({ verdict: "infected", detail: out.trim().slice(0, 200) });
      return resolve(null);
    });
  });
}

export async function scanFile(path: string, mime: string): Promise<{ verdict: ScanVerdict; backend: ScanBackend; detail: string }> {
  const socket = process.env.CLAMAV_SOCKET || "/var/run/clamav/clamd.sock";
  if (existsSync(socket)) {
    const r = await clamdScan(path, socket);
    if (r) return { ...r, backend: "clamd" };
  }
  const bin = await clamscanBin(path).catch(() => null);
  if (bin) return { ...bin, backend: "clamscan" };
  try {
    const buf = await readFile(path);
    const r = heuristic(buf, mime);
    return { ...r, backend: "heuristic" };
  } catch {
    return { verdict: "infected", detail: "unreadable file", backend: "heuristic" };
  }
}
