import { PageHead } from "@/components/admin-ui";
import { CrmConsole } from "@/components/crm-console";

export default function CrmPage() {
  return (
    <>
      <PageHead eyebrow="Engage" title="CRM & Loyalty"
        blurb="Pipeline stages, segments with lifetime value, points and tiers, review moderation, and the owner attention feed. Same shop scopes." />
      <CrmConsole />
    </>
  );
}
