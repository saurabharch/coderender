import { PageHead } from "@/components/admin-ui";
import { RetailConsole } from "@/components/retail-console";

export default function RetailPage() {
  return (
    <>
      <PageHead eyebrow="Sell" title="Marketing, Counter & Shipments"
        blurb="Campaigns to customer segments, abandoned-cart recovery, POS drawer with day settlement, and shipment tracking. Same shop scopes." />
      <RetailConsole />
    </>
  );
}
