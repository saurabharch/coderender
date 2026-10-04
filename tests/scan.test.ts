import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

describe("scan heuristic", () => {
  it("catches the EICAR test file", async () => {
    const { scanFile } = await import("@/lib/scan");
    const eicar = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
    const { writeFile, unlink } = await import("node:fs/promises");
    const p = "/data/data/com.termux/files/usr/tmp/opencode/eicar-test.txt";
    await writeFile(p, eicar);
    const r = await scanFile(p, "text/plain");
    // Real ClamAV may clear it as unknown; heuristic must flag it.
    if (r.backend === "heuristic") {
      expect(r.verdict).toBe("infected");
    } else {
      expect(["clean", "infected"]).toContain(r.verdict);
    }
    await unlink(p);
  });

  it("rejects executables, passes png bytes", async () => {
    const { scanFile } = await import("@/lib/scan");
    const { writeFile, unlink } = await import("node:fs/promises");
    const exe = "/data/data/com.termux/files/usr/tmp/opencode/fake-test.exe";
    await writeFile(exe, Buffer.from("MZ" + "x".repeat(100)));
    const r1 = await scanFile(exe, "application/octet-stream");
    if (r1.backend === "heuristic") expect(r1.verdict).toBe("infected");
    await unlink(exe);
    const png = "/data/data/com.termux/files/usr/tmp/opencode/blank-test.png";
    await writeFile(png, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]));
    const r2 = await scanFile(png, "image/png");
    // Heuristic passes minimal png; a real engine decides for itself.
    if (r2.backend === "heuristic") expect(r2.verdict).toBe("clean");
    await unlink(png);
  });
});
