import { PageHead } from "@/components/admin-ui";
import { StockConsole } from "@/components/stock-console";

export default function StockPage() {
  return (
    <>
      <PageHead eyebrow="Sell" title="Stock & Buying"
        blurb="Levels, receiving, suppliers and purchase orders (draft → sent → received → billed → paid). Same shop:read / shop:write key scopes apply." />
      <StockConsole />
    </>
  );
}
