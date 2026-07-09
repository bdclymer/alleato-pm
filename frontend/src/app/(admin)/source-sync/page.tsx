import { PageShell } from "@/components/layout";
import { DailyContentPanel } from "@/components/ai-intelligence/daily-content-panel";

export const dynamic = "force-dynamic";

export default function SourceSyncPage() {
  return (
    <PageShell variant="content" title="Content Sync">
      <DailyContentPanel />
    </PageShell>
  );
}
