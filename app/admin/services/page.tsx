import { PageHead } from "@/components/admin-ui";
import { ServicesConsole } from "@/components/services-console";

export default function ServicesPage() {
  return (
    <>
      <PageHead eyebrow="Workspace" title="Services & Branches"
        blurb="Job cards from booking to invoice, branch directory, and print templates. Same shop scopes." />
      <ServicesConsole />
    </>
  );
}
