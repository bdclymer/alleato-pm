import { notFound } from "next/navigation";

import { PageShell } from "@/components/layout";
import {
  getAppKnowledgeToolCategory,
  getTrainingDocToolCategory,
} from "@/features/knowledge/app-knowledge";
import { AppTrainingDocPage } from "@/features/knowledge/app-training-doc-page";
import { createServiceClient } from "@/lib/supabase/service";
import { getPublishedTrainingDocBySlug } from "@/lib/training-docs/server";

export const dynamic = "force-dynamic";

export default async function KnowledgeAppTrainingDocPage({
  params,
}: {
  params: Promise<{ docSlug: string; toolCategory: string }>;
}) {
  const { docSlug, toolCategory } = await params;
  const category = getAppKnowledgeToolCategory(toolCategory);
  if (!category) notFound();

  const doc = await getPublishedTrainingDocBySlug(createServiceClient(), docSlug);
  if (!doc) notFound();

  const publishedDoc = {
    title: doc.title,
    slug: doc.slug,
    summary: doc.summary,
    audience: doc.audience,
    status: doc.status,
    sourceRoute: doc.source_route,
    publishedDocPath: doc.published_doc_path!,
    lastPublishedAt: doc.last_published_at,
    appToolCategory:
      typeof doc.metadata.appToolCategory === "string"
        ? doc.metadata.appToolCategory
        : null,
  };
  if (getTrainingDocToolCategory(publishedDoc)?.slug !== category.slug) {
    notFound();
  }

  return (
    <PageShell
      variant="detailWide"
      title={doc.title}
      showHeader={false}
      contentClassName="mx-auto max-w-screen-2xl"
    >
      <AppTrainingDocPage
        activeCategorySlug={category.slug}
        backHref={`/knowledge/app/${category.slug}`}
        backLabel={`${category.title} training docs`}
        doc={doc}
      />
    </PageShell>
  );
}
