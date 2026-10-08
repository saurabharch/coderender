import { NextResponse } from "next/server";
import { getDb } from "@/lib/store";
import { getPref } from "@/lib/store";
import { commerceTables } from "@/lib/commerce";
import { parseReceiptWidth, receiptNo } from "@/lib/retail-core";
import { eanFromId } from "@/lib/barcode-core";
import { shopGate } from "@/lib/shop-auth";

// GET ?orderId= → printable bill: CRN, tracking barcode, lines with names,
// order money, payment remark, business profile. Powers POS receipts + reprints.
export async function GET(req: Request) {
  const deny = await shopGate(req, false);
  if (deny) return deny;
  const id = Number(new URL(req.url).searchParams.get("orderId") || 0);
  if (!id) return NextResponse.json({ error: "orderId required" }, { status: 422 });
  commerceTables();
  const db = getDb();
  const order = db.prepare("SELECT * FROM ShopOrder WHERE id=?").get(id) as
    { id: number; status: string; subtotal: number; discount: number; tax: number; grand: number; coupon: string; channel: string; createdAt: string } | undefined;
  if (!order) return NextResponse.json({ error: "no order" }, { status: 404 });
  const lines = db.prepare("SELECT productId, name, qty, price, total FROM OrderLine WHERE orderId=?").all(id);
  const payments = db.prepare("SELECT method, amount, status FROM Payment WHERE orderId=?").all(id);
  const biz = (k: string) => getPref(k, "");
  return NextResponse.json({
    crn: receiptNo(order.id, order.createdAt),
    barcode: eanFromId(order.id),
    order, lines, payments,
    business: {
      name: biz("biz_name"), address: biz("biz_address"), city: biz("biz_city"),
      state: biz("biz_state"), pin: biz("biz_pin"), gstin: biz("biz_gstin"),
      phone: biz("contact_phone"), email: biz("contact_email"),
    },
    meta: {
      width: parseReceiptWidth(biz("receipt_width") || "72"),
      logo: biz("brand_logo_light"),
    },
  });
}
