"use client";

import { useParams } from "next/navigation";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Card } from "@/components/ui/card";

export default function ProjectAdminPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <>
      <ProjectPageHeader
        title="Admin"
        description="Project administration settings"
      />
      <PageContainer>
        <Card className="p-6">
          <p className="text-muted-foreground">
            Admin for project {projectId} - Coming soon
          </p>
        </Card>
      </PageContainer>
    </>
  );
}
