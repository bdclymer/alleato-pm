"use client";

import * as React from "react";
import { Bot, FileText } from "lucide-react";

import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import type { PublishedTrainingDoc } from "@/lib/training-docs/docs-site";
import {
  APP_KNOWLEDGE_TOOL_CATEGORIES,
  getAppKnowledgeToolHref,
  getTrainingDocToolCategory,
} from "./app-knowledge";
import {
  KnowledgeBrowsePage,
  type KnowledgeCategoryConfig,
  type KnowledgeSourceItem,
} from "./knowledge-base-page";

export function AppTrainingDocsPage({
  activeCategorySlug,
  trainingDocs,
}: {
  activeCategorySlug?: string;
  trainingDocs: PublishedTrainingDoc[];
}) {
  const { profile } = useCurrentUserProfile();

  const categories = React.useMemo<KnowledgeCategoryConfig[]>(
    () =>
      APP_KNOWLEDGE_TOOL_CATEGORIES.map((category) => ({
        id: category.slug,
        label: category.title,
        description: category.description,
        href: getAppKnowledgeToolHref(category),
        icon: <FileText className="h-4 w-4" />,
      })),
    [],
  );

  const items = React.useMemo<KnowledgeSourceItem[]>(
    () =>
      trainingDocs.flatMap((doc) => {
        const category = getTrainingDocToolCategory(doc);
        if (!category) return [];

        return {
          id: doc.slug,
          categoryId: category.slug,
          title: doc.title,
          description:
            doc.summary?.trim() ||
            "Training doc published from the Alleato review workflow.",
          meta: doc.sourceRoute ?? "Training Docs",
          href: `/knowledge/app/${category.slug}/${doc.slug}`,
        };
      }),
    [trainingDocs],
  );

  const activeCategory = activeCategorySlug
    ? APP_KNOWLEDGE_TOOL_CATEGORIES.find(
        (category) => category.slug === activeCategorySlug,
      )
    : null;

  return (
    <KnowledgeBrowsePage
      actionHref={profile?.isAdmin === true ? "/training-docs" : null}
      actionIcon={<Bot className="h-4 w-4" />}
      actionLabel="Create training doc"
      activeCategoryId={activeCategory?.slug}
      categories={categories}
      emptyDescription="Admins can publish screenshot-backed walkthroughs from the training-doc workflow."
      emptyTitle="No training docs yet"
      eyebrow="App training"
      isAdmin={profile?.isAdmin === true}
      isLoading={false}
      items={items}
      modeLabel="App Training"
      navLabel="All tools"
      searchPlaceholder="Search training docs..."
      showCategoriesWhenEmpty
      sourceListNoun="training docs"
      title="Training Docs"
      topBarLabel="Knowledge"
      withShell={false}
    />
  );
}
