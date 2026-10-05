import { PageHead } from "@/components/admin-ui";
import { BillingConsole } from "@/components/billing-console";

export default function BillingPage() {
  return (
    <>
      <PageHead eyebrow="Sell" title="Billing & Money"
        blurb="Numbered bills from orders, cash/bank/UPI accounts with transfers, expenses with approval → pay, assets, and guarded refunds. Same shop scopes." />
      <BillingConsole />
    </>
  );
}
