import { PageShell } from "@/components/layout";
import { IntelligenceCompilerHealthPanel } from "@/components/ai-intelligence/intelligence-compiler-health-panel";

export const dynamic = "force-dynamic";

export default function IntelligenceCompilerPage() {
  return (
    <PageShell
      variant="dashboard"
      title="AI Intelligence Compiler"
      description="Operational health for source intelligence jobs, packet refreshes, promoted evidence, and project packets."
    >
      <IntelligenceCompilerHealthPanel />
    </PageShell>
  );
}
