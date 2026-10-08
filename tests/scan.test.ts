import { describe, expect, it } from "vitest";

async function tmpFile(name: string): Promise<string> {
  // Portable scratch path: Termux-approved tmp on-device, os.tmpdir() in CI.
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { mkdir } = await import("node:fs/promises");
  const base = process.env.TMPDIR || tmpdir();
  await mkdir(base, { recursive: true });
  return join(base, name);
}

describe("scan engine", () => {
  it("flags the EICAR test file (any backend)", async () => {
    const { scanFile } = await import("@/lib/scan");
    const { writeFile, unlink } = await import("node:fs/promises");
    const p = await tmpFile("eicar-test.txt");
    await writeFile(p, "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    const r = await scanFile(p, "text/plain");
    expect(r.verdict).toBe("infected");
    expect(["clamd", "clamscan", "heuristic"]).toContain(r.backend);
    await unlink(p);
  }, 120000);

  it("clears a benign png (any backend)", async () => {
    const { scanFile } = await import("@/lib/scan");
    const { writeFile, unlink } = await import("node:fs/promises");
    const p = await tmpFile("blank-test.png");
    await writeFile(p, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
    const r = await scanFile(p, "image/png");
    expect(r.verdict).toBe("clean");
    await unlink(p);
  }, 120000);
});
