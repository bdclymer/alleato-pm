import { PageShell } from "@/components/layout";
import { ChangeManagementDashboard } from "@/components/domain/change-management";

export default function ChangeManagementPage() {
  return (
    <PageShell variant="dashboard" title="Change Management">
      <ChangeManagementDashboard />
    </PageShell>
  );
}
