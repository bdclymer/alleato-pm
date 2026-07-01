"use client";

import * as React from "react";
import { Bot } from "lucide-react";

import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import type { PublishedTrainingDoc } from "@/lib/training-docs/docs-site";
import {
  APP_KNOWLEDGE_TOOL_CATEGORIES,
  getAppKnowledgeToolHref,
} from "./app-knowledge";
import {
  AppKnowledgeToolNav,
  getAppToolIcon,
} from "./app-knowledge-tool-nav";
import {
  KnowledgeBrowsePage,
  type KnowledgeCategoryConfig,
} from "./knowledge-base-page";

export function AppTrainingDocsPage({
  activeCategorySlug,
}: {
  activeCategorySlug?: string;
  trainingDocs?: PublishedTrainingDoc[];
}) {
  const { profile } = useCurrentUserProfile();
  const isAdmin = profile?.isAdmin === true;

  const categories = React.useMemo<KnowledgeCategoryConfig[]>(
    () =>
      APP_KNOWLEDGE_TOOL_CATEGORIES.map((category) => ({
        id: category.slug,
        label: category.title,
        description: category.description,
        href: getAppKnowledgeToolHref(category),
        icon: getAppToolIcon(category.slug),
      })),
    [],
  );

  return (
    <KnowledgeBrowsePage
      actionHref={isAdmin ? "/training-docs" : null}
      actionIcon={<Bot className="h-4 w-4" />}
      actionLabel="Create"
      activeCategoryId={activeCategorySlug}
      categories={categories}
      emptyDescription="Published training docs will appear here after review."
      emptyTitle="No training docs yet"
      eyebrow="App"
      isAdmin={isAdmin}
      isLoading={false}
      items={[]}
      modeLabel="App"
      navLabel="All tools"
      overviewDescription="Step-by-step app documentation organized by tool."
      searchPlaceholder="Search training docs..."
      showCategoriesWhenEmpty
      sideNavSlot={<AppKnowledgeToolNav activeSlug={activeCategorySlug ?? null} />}
      sourceListNoun="training docs"
      title="Training Docs"
      topBarLabel="Knowledge"
      withShell={false}
    />
  );
}

