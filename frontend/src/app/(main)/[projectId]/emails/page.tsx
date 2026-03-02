"use client";

import { useParams } from "next/navigation";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Card } from "@/components/ui/card";

export default function ProjectEmailsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <>
      <ProjectPageHeader
        title="Emails"
        description="Project email communications"
      />
      <PageContainer>
        <Card className="p-6">
          <p className="text-muted-foreground">
            Emails for project {projectId} - Coming soon
          </p>
        </Card>
      </PageContainer>
    </>
  );
}
