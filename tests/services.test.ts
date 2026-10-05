import { describe, expect, it } from "vitest";
import { jobCan, jobNumber, renderTemplate } from "@/lib/service-core";

describe("service-core", () => {
  it("walks job flow without skips", () => {
    expect(jobCan("booked", "assigned")).toBe(true);
    expect(jobCan("booked", "done")).toBe(false);
    expect(jobCan("assigned", "in-progress")).toBe(true);
    expect(jobCan("in-progress", "done")).toBe(true);
    expect(jobCan("done", "invoiced")).toBe(true); // via billing op only (PUT status enum excludes it)
    expect(jobCan("invoiced", "done")).toBe(false);
  });

  it("numbers jobs + renders templates", () => {
    expect(jobNumber(7, new Date("2026-03-01"))).toBe("JOB-2026-0007");
    expect(renderTemplate("Hi {{name}} {{missing}}!", { name: "Asha" })).toBe("Hi Asha !");
  });
});
