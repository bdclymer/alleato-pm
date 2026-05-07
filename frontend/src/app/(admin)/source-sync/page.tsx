import { PageShell } from "@/components/layout";
import { SourceSyncHealthPanel } from "@/components/ai-intelligence/source-sync-health-panel";

export const dynamic = "force-dynamic";

export default function SourceSyncPage() {
  return (
    <PageShell
      variant="dashboard"
      title="Source Sync"
      description="Operational health for Microsoft Graph, Fireflies, vectorization, task extraction, compiler work, and intelligence packet readiness."
    >
      <SourceSyncHealthPanel />
    </PageShell>
  );
}
