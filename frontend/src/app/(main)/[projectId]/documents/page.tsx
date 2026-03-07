"use client";

import { useParams } from "next/navigation";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ds";
import { FileText } from "lucide-react";

export default function ProjectDocumentsPage() {
  const params = useParams();
  void params.projectId;

  return (
    <>
      <ProjectPageHeader
        title="Documents"
        description="Manage project documents and files"
      />
      <PageContainer>
        <EmptyState
          icon={<FileText className="h-6 w-6 text-muted-foreground" />}
          title="Documents coming soon"
          description="Document management will be available in an upcoming release."
        />
      </PageContainer>
    </>
  );
}
