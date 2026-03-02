"use client";

import { useParams } from "next/navigation";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { Card } from "@/components/ui/card";

export default function ProjectTransmittalsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <>
      <ProjectPageHeader
        title="Transmittals"
        description="Document transmittals"
      />
      <PageContainer>
        <Card className="p-6">
          <p className="text-muted-foreground">
            Transmittals for project {projectId} - Coming soon
          </p>
        </Card>
      </PageContainer>
    </>
  );
}
