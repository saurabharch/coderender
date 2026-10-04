import { describe, expect, it } from "vitest";

describe("scan engine", () => {
  it("flags the EICAR test file (any backend)", async () => {
    const { scanFile } = await import("@/lib/scan");
    const { writeFile, unlink } = await import("node:fs/promises");
    const p = "/data/data/com.termux/files/usr/tmp/opencode/eicar-test.txt";
    await writeFile(p, "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
    const r = await scanFile(p, "text/plain");
    expect(r.verdict).toBe("infected");
    expect(["clamd", "clamscan", "heuristic"]).toContain(r.backend);
    await unlink(p);
  }, 120000);

  it("clears a benign png (any backend)", async () => {
    const { scanFile } = await import("@/lib/scan");
    const { writeFile, unlink } = await import("node:fs/promises");
    const p = "/data/data/com.termux/files/usr/tmp/opencode/blank-test.png";
    await writeFile(p, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
    const r = await scanFile(p, "image/png");
    expect(r.verdict).toBe("clean");
    await unlink(p);
  }, 120000);
});
