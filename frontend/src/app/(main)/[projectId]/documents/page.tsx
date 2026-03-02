"use client";

import { useParams } from "next/navigation";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Card } from "@/components/ui/card";

export default function ProjectDocumentsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <>
      <ProjectPageHeader
        title="Documents"
        description="Manage project documents and files"
      />
      <PageContainer>
        <Card className="p-6">
          <p className="text-muted-foreground">
            Documents for project {projectId} - Coming soon
          </p>
        </Card>
      </PageContainer>
    </>
  );
}
