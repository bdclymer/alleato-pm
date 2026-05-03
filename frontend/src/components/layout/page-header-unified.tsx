"use client";

import * as React from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProject } from "@/contexts/project-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Container } from "@/components/layout/container";
import { Stack } from "@/components/layout/stack";
import { Inline } from "@/components/layout/inline";
import { Eyebrow } from "@/components/ds/eyebrow";
import { Heading } from "@/components/ds/heading";
import { Text } from "@/components/ds/text";
import {
  Breadcrumb,
  BreadcrumbItem as UiBreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageTabsV2 } from "@/components/layout/PageTabsV2";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  // Content
  title: string;
  titleContent?: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: string;

  // Layout options
  variant?: "default" | "executive" | "compact" | "budget";
  actions?: React.ReactNode;
  mobileActionsInline?: boolean;
  className?: string;

  // Navigation
  breadcrumbs?: BreadcrumbItem[];
  tabs?: { label: string; href: string; count?: number; isActive?: boolean }[];

  // Project context
  showProjectName?: boolean;
  preHeading?: {
    project?: string;
    client?: string;
  };

  // Status
  statusBadge?: React.ReactNode;

  // Export functionality
  showExportButton?: boolean;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  exportLabel?: string;
}

/**
 * Unified PageHeader component that consolidates all page header variations
 *
 * @example Default usage
 * ```tsx
 * <PageHeader title="Budget" description="Manage your project budget" />
 * ```
 *
 * @example Executive variant with pre-heading
 * ```tsx
 * <PageHeader
 *   variant="executive"
 *   preHeading={{ project: "Project Name", client: "Client Name" }}
 *   title="Financial Overview"
 * />
 * ```
 *
 * @example With custom title content and status
 * ```tsx
 * <PageHeader
 *   titleContent={
 *     <Inline>
 *       <Heading>Budget</Heading>
 *       <StatusBadge status="locked" />
 *     </Inline>
 *   }
 * />
 * ```
 */
export function PageHeader({
  title,
  titleContent,
  eyebrow,
  description,
  variant = "default",
  actions,
  mobileActionsInline = false,
  className,
  breadcrumbs,
  showProjectName = false,
  preHeading,
  statusBadge,
  showExportButton = false,
  onExportCSV,
  onExportPDF,
  exportLabel = "Export",
  tabs,
}: PageHeaderProps) {
  // Subheadings are intentionally suppressed globally to keep page headers tighter.
  void description;

  const { selectedProject, isLoading } = useProject();

  // Only show project name when explicitly requested
  const shouldShowProjectName = showProjectName && selectedProject;

  if (variant === "executive") {
    return (
      <div className={cn("bg-slate-50", className)}>
        <Container size="xl">
          <Stack gap="md" className="py-12">
            {preHeading && (preHeading.project || preHeading.client) && (
              <Text
                size="sm"
                tone="muted"
                transform="uppercase"
                className="tracking-wider"
              >
                {[preHeading.project, preHeading.client]
                  .filter(Boolean)
                  .join(" / ")}
              </Text>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-light tracking-tight">
              {title}
            </h1>
            {actions && (
              <Inline gap="sm" className="pt-2">
                {actions}
              </Inline>
            )}
          </Stack>
        </Container>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("border-b", className)}>
        <div className="py-4">
          <div className="flex items-center justify-between">
            <Inline gap="md" align="center">
              {titleContent || <Heading level={5} as="h2">{title}</Heading>}
              {statusBadge}
            </Inline>
            {actions && <Inline gap="sm">{actions}</Inline>}
          </div>
        </div>
      </div>
    );
  }

  // Default variant (includes budget variant behavior)
  return (
    <div className={cn(className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumb className="pb-2">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb.label}-${index}`}>
                    <UiBreadcrumbItem>
                      {isLast || !crumb.href ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </UiBreadcrumbItem>
                    {!isLast ? <BreadcrumbSeparator /> : null}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}

        {/* Title and Actions */}
        <div
          className={cn(
            "min-w-0 pt-4 pb-1",
            mobileActionsInline
              ? "flex items-center justify-between gap-3"
              : "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
          )}
        >
          {/* Left: title + badges (desktop only) */}
          <div className="min-w-0 flex-1">
            {/* Project Name */}
            {shouldShowProjectName && (
              <div className="mb-1">
                {isLoading ? (
                  <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                ) : selectedProject ? (
                  <div className="text-sm font-medium text-muted-foreground">
                    {selectedProject.number && (
                      <span>{selectedProject.number} · </span>
                    )}
                    <span>{selectedProject.name}</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Page Title */}
            {eyebrow ? (
              <div className="mb-2">
                <Eyebrow>{eyebrow}</Eyebrow>
              </div>
            ) : null}
            {titleContent ? (
              titleContent
            ) : (
              <h1 className="text-3xl sm:text-3xl lg:text-[2rem] font-medium text-foreground/90 break-words">
                {title}
              </h1>
            )}

            {/* Status badges — desktop: below title */}
            {statusBadge && (
              <div className="hidden sm:flex flex-wrap items-center gap-2 mt-2">
                {statusBadge}
              </div>
            )}
          </div>

          {/* Right: actions + badges below (mobile) */}
          {(actions || showExportButton || statusBadge) && (
            <div
              className={cn(
                "shrink-0",
                mobileActionsInline
                  ? "flex items-center justify-end"
                  : "flex w-full flex-col gap-2 sm:w-auto sm:items-end",
              )}
            >
              {(actions || showExportButton) && (
                <div
                  className={cn(
                    "flex items-center gap-2 max-sm:[&_button]:min-h-11",
                    mobileActionsInline ? "justify-end" : "w-full flex-wrap sm:w-auto",
                  )}
                >
                  {showExportButton && (onExportCSV || onExportPDF) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download />
                          {exportLabel}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onExportCSV && (
                          <DropdownMenuItem onClick={onExportCSV}>
                            Export as CSV
                          </DropdownMenuItem>
                        )}
                        {onExportPDF && (
                          <DropdownMenuItem onClick={onExportPDF}>
                            Export as PDF
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {actions}
                </div>
              )}
              {/* Status badges — mobile: below actions */}
              {statusBadge && (
                <div className="flex sm:hidden flex-wrap items-center gap-2">
                  {statusBadge}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs — rendered below title/actions, flush with the header bottom */}
        {tabs && tabs.length > 0 && (
          <PageTabsV2 tabs={tabs} />
        )}
      </div>
    </div>
  );
}

// Backwards compatibility handled via named export above.
