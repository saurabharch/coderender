import { PageHead } from "@/components/admin-ui";
import { RetailConsole } from "@/components/retail-console";
import { SubTabs } from "@/components/admin-ui";
import { Calculator, Megaphone, Truck } from "lucide-react";

const RETAIL_TABS = ["marketing", "counter", "shipments"] as const;

export default async function RetailPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const raw = (await searchParams).tab ?? "counter";
  const tab = (RETAIL_TABS as readonly string[]).includes(raw) ? raw : "counter";
  return (
    <>
      <PageHead eyebrow="Sell" title="Marketing, Counter & Shipments"
        blurb="Campaigns to customer segments, abandoned-cart recovery, POS drawer with day settlement, and shipment tracking. Same shop scopes." />
      <SubTabs active={tab} label="Retail" tabs={[
        { id: "marketing", label: "Marketing", Icon: Megaphone, href: "/admin/retail?tab=marketing" },
        { id: "counter", label: "Counter", Icon: Calculator, href: "/admin/retail?tab=counter" },
        { id: "shipments", label: "Shipments", Icon: Truck, href: "/admin/retail?tab=shipments" },
      ]} />
      <div className="mt-3"><RetailConsole tab={tab} /></div>
    </>
  );
}
