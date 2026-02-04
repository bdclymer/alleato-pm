"use client";

import { ReactNode } from "react";
import { PageHeader } from "@/components/layout";
import { PageContainer } from "@/components/layout";

interface ProjectToolPageProps {
  project?: string;
  client?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Reusable layout component for project-scoped tool pages.
 * Provides consistent header and container styling.
 */
export function ProjectToolPage({
  project,
  client,
  title,
  description,
  actions,
  children,
}: ProjectToolPageProps) {
  return (
    <>
      <PageHeader
        preHeading={project || client ? { project, client } : undefined}
        title={title}
        description={description}
        actions={actions}
      />
      <PageContainer>{children}</PageContainer>
    </>
  );
}
