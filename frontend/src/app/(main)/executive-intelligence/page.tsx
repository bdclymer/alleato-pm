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
      title="Executive Intelligence"
      description="A command-center view of Alleato's executive AI system."
      contentClassName="space-y-12"
    >
      <ExecutiveIntelligencePage />
    </PageShell>
  );
}
