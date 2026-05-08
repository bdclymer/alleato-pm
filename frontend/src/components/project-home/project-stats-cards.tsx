"use client";

import { FileText } from "lucide-react";
import { EmptyState } from "@/components/ds";

interface ProjectStatsCardsProps {
  projectId: string;
}

export function ProjectStatsCards({ projectId }: ProjectStatsCardsProps) {
  return (
    <EmptyState
      icon={<FileText />}
      title="Project stats unavailable"
      description={`Project ${projectId} does not have a live stats summary wired to this component yet.`}
    />
  );
}
