import { NextResponse } from "next/server";
import { invoiceForOrder, receiptForPayment, transcriptForPayout } from "@/lib/finance";
import { renderBillPdf, type BillTheme } from "@/lib/pdf-bill";
import { sessionUser } from "@/lib/auth";
import { getPref } from "@/lib/store";

// Team-only PDF downloads (client PII inside). ?theme=modern|minimal.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const user = await sessionUser();
  if (!user) return NextResponse.json({ error: "login required" }, { status: 401 });
  const { kind, id } = await params;
  const doc = kind === "invoice" ? invoiceForOrder(Number(id))
    : kind === "receipt" ? receiptForPayment(Number(id))
    : kind === "payout" ? transcriptForPayout(Number(id)) : null;
  if (!doc) return NextResponse.json({ error: "no document" }, { status: 404 });
  const q = new URL(req.url).searchParams;
  const theme: BillTheme = q.get("theme") === "minimal" ? "minimal" : "modern";
  const rollRaw = Number(q.get("roll") || 0);
  const rollMm = rollRaw === 58 || rollRaw === 72 || rollRaw === 80 ? rollRaw : undefined;
  const pick = (k: string): string => {
    try { return getPref(k, ""); } catch { return ""; }
  };
  const bytes = await renderBillPdf(
    doc,
    {
      name: pick("biz_name") || "CodeRender",
      address: [pick("biz_address"), pick("biz_city"), pick("biz_state"), pick("biz_pin")]
        .filter(Boolean).join(", "),
      phone: pick("contact_phone") || pick("biz_phone"),
      email: pick("contact_email") || pick("biz_email"),
      gstin: pick("biz_gstin"),
      primary: pick("brand_primary") || "#0F8F83",
    },
    theme,
    rollMm ? { rollMm } : {},
  );
  const body = new Uint8Array(bytes);
  return new NextResponse(body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${doc.no}-${theme}${rollMm ? `-roll${rollMm}` : ""}.pdf"`,
      "content-length": String(body.byteLength),
      "cache-control": "private, no-store",
    },
  });
}
