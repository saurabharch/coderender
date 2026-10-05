import { PageHead } from "@/components/admin-ui";
import { ScaleConsole } from "@/components/scale-console";

export default function ScalePage() {
  return (
    <>
      <PageHead eyebrow="System" title="Scale & Platform"
        blurb="Channel directory, franchise royalties, the RBAC matrix, CSV migration and the audit trail." />
      <ScaleConsole />
    </>
  );
}
