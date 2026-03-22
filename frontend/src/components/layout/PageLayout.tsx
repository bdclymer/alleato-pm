import * as React from "react";
import { cn } from "@/lib/utils";
import { PageContainer, type PageContainerProps } from "./PageContainer";
import { PageHeader } from "./page-header-unified";

interface PageLayoutProps {
  // PageHeader props
  title: string;
  description?: string;
  actions?: React.ReactNode;

  // PageContainer props
  maxWidth?: PageContainerProps["maxWidth"];
  className?: string;
  containerClassName?: string;

  children: React.ReactNode;
}

/**
 * PageLayout — wraps PageHeader and page content inside a single PageContainer
 * so both share the same horizontal padding and max-width, ensuring perfect alignment.
 *
 * Use this for any non-table page that would otherwise compose PageHeader + PageContainer
 * separately (which causes the header to be full-width while content is inset).
 *
 * @example
 * ```tsx
 * <PageLayout title="Procore Documentation" description="Browse docs and ask the AI">
 *   <div className="grid ...">...</div>
 * </PageLayout>
 * ```
 */
export function PageLayout({
  title,
  description,
  actions,
  maxWidth,
  className,
  containerClassName,
  children,
}: PageLayoutProps) {
  return (
    <PageContainer
      maxWidth={maxWidth}
      className={cn("flex flex-col", containerClassName)}
    >
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        className={className}
      />
      {children}
    </PageContainer>
  );
}
