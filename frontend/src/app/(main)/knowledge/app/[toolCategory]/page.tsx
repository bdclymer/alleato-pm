import { notFound } from "next/navigation";

import { getAppKnowledgeToolCategory } from "@/features/knowledge/app-knowledge";
import { AppTrainingDocsPage } from "@/features/knowledge/app-training-docs-page";

export const dynamic = "force-dynamic";

export default async function KnowledgeAppToolCategoryPage({
  params,
}: {
  params: Promise<{ toolCategory: string }>;
}) {
  const { toolCategory } = await params;
  const category = getAppKnowledgeToolCategory(toolCategory);
  if (!category) notFound();

  return <AppTrainingDocsPage activeCategorySlug={category.slug} />;
}
