"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Trash2 } from "lucide-react";

import { PageShell } from "@/components/layout";
import { EmptyState } from "@/components/ds";

const tabs = (projectId: string) => [
  { label: "Current Drawings", href: `/${projectId}/drawings`, isActive: false },
  { label: "Drawing Sets", href: `/${projectId}/drawings/sets`, isActive: false },
  { label: "All Sets & Revisions", href: `/${projectId}/drawings/revisions-report`, isActive: false },
  { label: "Recycle Bin", href: `/${projectId}/drawings/recycle-bin`, isActive: true },
];

export default function DrawingRecycleBinPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? "";

  return (
    <PageShell
      variant="table"
      title="Drawings"
      description="View, manage, and upload all of your drawings from the Drawings log."
      tabs={tabs(projectId)}
    >
      <EmptyState
        icon={<Trash2 className="h-8 w-8 text-muted-foreground" />}
        title="Recycle Bin is empty"
        description="Deleted drawings will appear here and can be restored."
      />
    </PageShell>
  );
}
