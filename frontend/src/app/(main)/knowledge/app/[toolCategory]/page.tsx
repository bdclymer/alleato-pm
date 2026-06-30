import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout";
import { getAppKnowledgeToolCategory } from "@/features/knowledge/app-knowledge";
import { AppTrainingDocsPage } from "@/features/knowledge/app-training-docs-page";
import { createServiceClient } from "@/lib/supabase/service";
import { listPublishedTrainingDocs } from "@/lib/training-docs/server";

export const dynamic = "force-dynamic";

export default async function KnowledgeAppToolCategoryPage({
  params,
}: {
  params: Promise<{ toolCategory: string }>;
}) {
  const { toolCategory } = await params;
  const category = getAppKnowledgeToolCategory(toolCategory);
  if (!category) notFound();

  const trainingDocs = await listPublishedTrainingDocs(createServiceClient());
  return (
    <PageShell
      variant="detailWide"
      title={`${category.title} Training Docs`}
      showHeader={false}
      contentClassName="mx-auto max-w-screen-2xl"
    >
      <AppTrainingDocsPage
        activeCategorySlug={category.slug}
        trainingDocs={trainingDocs}
      />
    </PageShell>
  );
}
