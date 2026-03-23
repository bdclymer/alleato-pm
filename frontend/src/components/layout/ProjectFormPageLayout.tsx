"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader as ProjectPageHeader } from "@/components/layout/page-header-unified";

interface ProjectFormPageLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  onBack?: () => void;
  backLabel?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  className?: string;
  innerClassName?: string;
  contentClassName?: string;
  headerActions?: React.ReactNode;
}

const formWidthClassMap = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  "3xl": "max-w-[1600px]",
  full: "max-w-full",
};

export function ProjectFormPageLayout({
  title,
  description,
  children,
  breadcrumbs,
  onBack,
  backLabel = "Back",
  maxWidth = "lg",
  className,
  innerClassName,
  contentClassName,
  headerActions,
}: ProjectFormPageLayoutProps) {
  const defaultBackAction = onBack ? (
    <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </Button>
  ) : null;

  return (
    <div className={cn("mx-auto w-full", formWidthClassMap[maxWidth], className)}>
      <PageContainer className="space-y-8 px-4 pb-8 pt-3 sm:px-5 sm:pb-10 sm:pt-3 md:pb-12">
        <div className={cn("space-y-8", innerClassName)}>
          <ProjectPageHeader
            title={title}
            description={description}
            breadcrumbs={breadcrumbs}
            actions={headerActions ?? defaultBackAction}
          />
          <div className={cn("space-y-8", contentClassName)}>{children}</div>
        </div>
      </PageContainer>
    </div>
  );
}
