import { PageHead } from "@/components/admin-ui";
import { PeopleConsole } from "@/components/people-console";

export default function PeoplePage() {
  return (
    <>
      <PageHead eyebrow="Workspace" title="People & Payroll"
        blurb="Employees, advances, monthly payroll with loan slices, attendance, leave and timesheets. Same shop scopes." />
      <PeopleConsole />
    </>
  );
}
