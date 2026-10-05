import { PageHead } from "@/components/admin-ui";
import { BiConsole } from "@/components/bi-console";

export default function BiPage() {
  return (
    <>
      <PageHead eyebrow="Workspace" title="Business Intelligence"
        blurb="Revenue, growth, margins from real ledger costs, best and slow products, repeat buyers." />
      <BiConsole />
    </>
  );
}
