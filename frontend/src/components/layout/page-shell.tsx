"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageContainer } from "./PageContainer";
import { PageHeader } from "./page-header-unified";

// ─────────────────────────────────────────────────────────────────────────────
// PageShell — the one true entry point for all page layouts.
//
// Usage:
//   <PageShell variant="dashboard" title="Project Dashboard">...</PageShell>
//   <PageShell variant="table"     title="Commitments" actions={<Button>+ New</Button>}>...</PageShell>
//   <PageShell variant="form"      title="Create Contract" onBack={() => router.back()}>...</PageShell>
//   <PageShell variant="detail"    title="Contract #1042" statusBadge={<StatusBadge status="Draft" />}>...</PageShell>
//   <PageShell variant="content"   title="About">...</PageShell>
//
// Variants:
//   dashboard — full-width, standard padding. Use for home/overview pages with KPI cards + charts.
//   table     — full-width, tight padding. Use for data table pages (UnifiedTablePage goes inside).
//   form      — max-w-5xl centered, space-y-8. Use for create/edit forms. Includes optional back button.
//   detail    — max-w-6xl centered. Use for record detail pages (tabs, line items).
//   content   — max-w-4xl centered. Use for document/settings/read-heavy pages.
// ─────────────────────────────────────────────────────────────────────────────

export type PageShellVariant = "dashboard" | "table" | "form" | "detail" | "content";

export interface PageShellProps {
  variant: PageShellVariant;

  // Header
  title: string;
  description?: string;
  showHeader?: boolean;
  titleContent?: React.ReactNode;
  actions?: React.ReactNode;
  statusBadge?: React.ReactNode;
  tabs?: { label: string; href: string; isActive: boolean }[];
  showExportButton?: boolean;
  onExportCSV?: () => void;
  onExportPDF?: () => void;

  // Back navigation (form variant)
  onBack?: () => void;
  backLabel?: string;

  // Content
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const variantConfig: Record<
  PageShellVariant,
  { containerMaxWidth: "full" | "sm" | "md" | "lg" | "xl" | "2xl"; contentMaxWidth?: string; spacing: string }
> = {
  dashboard: { containerMaxWidth: "full", spacing: "space-y-6" },
  table:     { containerMaxWidth: "full", spacing: "space-y-4" },
  form:      { containerMaxWidth: "full", contentMaxWidth: "max-w-5xl",  spacing: "space-y-8" },
  detail:    { containerMaxWidth: "full", contentMaxWidth: "max-w-6xl",  spacing: "space-y-6" },
  content:   { containerMaxWidth: "full", contentMaxWidth: "max-w-4xl",  spacing: "space-y-8" },
};

export function PageShell({
  variant,
  title,
  showHeader = true,
  titleContent,
  actions,
  statusBadge,
  showExportButton,
  onExportCSV,
  onExportPDF,
  onBack,
  backLabel = "Back",
  description,
  tabs,
  children,
  className,
  contentClassName,
}: PageShellProps) {
  const config = variantConfig[variant];

  const backButton =
    onBack ? (
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
        <ArrowLeft />
        {backLabel}
      </Button>
    ) : null;

  // For form/detail/content, resolve the actions: prefer explicit actions, fall back to back button
  const resolvedActions = actions ?? (variant === "form" ? backButton : undefined);

  const header = showHeader ? (
    <PageHeader
      title={title}
      description={description}
      titleContent={titleContent}
      actions={resolvedActions}
      statusBadge={statusBadge}
      tabs={tabs}
      showExportButton={showExportButton}
      onExportCSV={onExportCSV}
      onExportPDF={onExportPDF}
    />
  ) : null;

  // Table variant: no extra bottom padding, tight layout
  if (variant === "table") {
    return (
      <PageContainer maxWidth={config.containerMaxWidth} className={cn(className)}>
        {header}
        <div className={cn(contentClassName)}>{children}</div>
      </PageContainer>
    );
  }

  // Form/detail/content: constrained inner width
  if (config.contentMaxWidth) {
    return (
      <PageContainer maxWidth={config.containerMaxWidth} className={cn("pb-14", className)}>
        <div className={cn("mx-auto w-full", config.contentMaxWidth)}>
          {header}
          <div className={cn(config.spacing, contentClassName)}>{children}</div>
        </div>
      </PageContainer>
    );
  }

  // Dashboard (and fallback): full width
  return (
    <PageContainer maxWidth={config.containerMaxWidth} className={cn("pb-6", className)}>
      {header}
      <div className={cn(config.spacing, contentClassName)}>{children}</div>
    </PageContainer>
  );
}
