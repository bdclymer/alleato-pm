"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderOpen,
  Handshake,
  HardHat,
  Receipt,
} from "lucide-react";

import { useCurrentUserProfile } from "@/hooks/use-current-user-profile";
import { getPublishedTrainingDocUrl } from "@/lib/training-docs/constants";
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

const TOOL_ICON_BY_SLUG: Record<string, React.ReactNode> = {
  projects: <Building2 className="h-4 w-4" />,
  budget: <Receipt className="h-4 w-4" />,
  "prime-contracts": <FileText className="h-4 w-4" />,
  commitments: <Handshake className="h-4 w-4" />,
  "change-events": <ClipboardList className="h-4 w-4" />,
  "change-orders": <FileText className="h-4 w-4" />,
  schedule: <CalendarDays className="h-4 w-4" />,
  meetings: <CalendarDays className="h-4 w-4" />,
  "rfis-and-submittals": <HardHat className="h-4 w-4" />,
  "documents-and-drawings": <FolderOpen className="h-4 w-4" />,
  "training-docs": <BookOpen className="h-4 w-4" />,
};

export function AppTrainingDocsPage({
  activeCategorySlug,
  trainingDocs,
}: {
  activeCategorySlug?: string;
  trainingDocs: PublishedTrainingDoc[];
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
        icon: TOOL_ICON_BY_SLUG[category.slug] ?? <BookOpen className="h-4 w-4" />,
      })),
    [],
  );

  const items = React.useMemo<KnowledgeSourceItem[]>(
    () =>
      trainingDocs.flatMap((doc) => {
        const category = getTrainingDocToolCategory(doc);
        const href = getPublishedTrainingDocUrl(doc.publishedDocPath);
        if (!category || !href) return [];

        return {
          id: doc.slug,
          categoryId: category.slug,
          title: doc.title,
          description:
            doc.summary?.trim() ||
            "Training doc published from the Alleato review workflow.",
          meta: [doc.sourceRoute, doc.lastPublishedAt ? formatDate(doc.lastPublishedAt) : null]
            .filter(Boolean)
            .join(" · "),
          href,
        };
      }),
    [trainingDocs],
  );

  return (
    <KnowledgeBrowsePage
      actionHref={isAdmin ? "/training-docs" : null}
      actionIcon={<Bot className="h-4 w-4" />}
      actionLabel="Create training doc"
      activeCategoryId={activeCategorySlug}
      categories={categories}
      emptyDescription="Published training docs will appear here after review."
      emptyTitle="No training docs yet"
      eyebrow="App"
      isAdmin={isAdmin}
      isLoading={false}
      items={items}
      modeLabel="App"
      navLabel="All tools"
      overviewDescription="Step-by-step app documentation organized by tool."
      searchPlaceholder="Search training docs..."
      showCategoriesWhenEmpty
      sourceListNoun="training docs"
      title="Training Docs"
      topBarLabel="Knowledge"
      withShell={false}
    />
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString();
}
