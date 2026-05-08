import { ExecutiveIntelligencePage } from "@/components/executive/executive-intelligence-page";
import { PageShell } from "@/components/layout";

export const metadata = {
  title: "Executive Intelligence | Alleato",
  description: "Alleato executive AI command center and agent team.",
};

export default function Page() {
  return (
    <PageShell
      variant="dashboard"
      title=""
      showHeader={false}
      contentClassName="space-y-12"
    >
      <ExecutiveIntelligencePage />
    </PageShell>
  );
}
