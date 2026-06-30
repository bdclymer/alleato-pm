import { AppHelpPage } from "@/features/knowledge/app-help-page";
import { PageShell } from "@/components/layout";
import { createServiceClient } from "@/lib/supabase/service";
import { listPublishedTrainingDocs } from "@/lib/training-docs/server";

export const dynamic = "force-dynamic";

export default async function KnowledgeAppPage() {
  const trainingDocs = await listPublishedTrainingDocs(createServiceClient());
  return (
    <PageShell
      variant="content"
      title="How to Use the App"
      description="Find app instructions by tool."
      contentClassName="max-w-5xl"
    >
      <AppHelpPage trainingDocs={trainingDocs} withShell={false} />
    </PageShell>
  );
}
