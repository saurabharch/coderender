import { PageHead } from "@/components/admin-ui";
import { ShopConsole } from "@/components/shop-console";

export default function ShopPage() {
  return (
    <>
      <PageHead eyebrow="Sell" title="Shop"
        blurb="Products, orders, coupons and tax — the commerce foundation. Services can also call these over API keys with shop:read / shop:write scopes." />
      <ShopConsole />
    </>
  );
}
