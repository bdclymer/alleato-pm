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
  onBack?: () => void;
  backLabel?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
  headerActions?: React.ReactNode;
}

const formWidthClassMap = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-full",
};

export function ProjectFormPageLayout({
  title,
  description,
  children,
  onBack,
  backLabel = "Back",
  maxWidth = "lg",
  className,
  headerActions,
}: ProjectFormPageLayoutProps) {
  const defaultBackAction = onBack ? (
    <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
      <ArrowLeft className="h-4 w-4" />
      {backLabel}
    </Button>
  ) : null;

  return (
    <div
      className={cn("mx-auto w-full", formWidthClassMap[maxWidth])}
    >
      <div className="pb-6 md:pb-8">
        <ProjectPageHeader
          title={title}
          description={description}
          actions={headerActions ?? defaultBackAction}
        />
      </div>
      <PageContainer className={cn("space-y-8 pb-16", className)}>
        {children}
      </PageContainer>
    </div>
  );
}
