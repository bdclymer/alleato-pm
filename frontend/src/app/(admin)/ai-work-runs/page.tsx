import { PageShell } from "@/components/layout";
import { AiWorkRunsClient } from "./ai-work-runs-client";

export const dynamic = "force-dynamic";

export default function AiWorkRunsPage() {
  return (
    <PageShell
      variant="table"
      title="AI Work Runs"
      eyebrow="Admin"
      description="Recent Executive Daily Brief runs, delivery state, source policy, and evidence rows from the AI operations ledger."
      contentClassName="space-y-6"
    >
      <AiWorkRunsClient />
    </PageShell>
  );
}
