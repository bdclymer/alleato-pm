import { AppTrainingDocsPage } from "@/features/knowledge/app-training-docs-page";
import { PageShell } from "@/components/layout";
import { createServiceClient } from "@/lib/supabase/service";
import { listPublishedTrainingDocs } from "@/lib/training-docs/server";

export const dynamic = "force-dynamic";

export default async function KnowledgeAppPage() {
  const trainingDocs = await listPublishedTrainingDocs(createServiceClient());
  return (
    <PageShell
      variant="detailWide"
      title="App Knowledge Base"
      showHeader={false}
      contentClassName="max-w-screen-2xl"
    >
      <AppTrainingDocsPage trainingDocs={trainingDocs} />
    </PageShell>
  );
}
