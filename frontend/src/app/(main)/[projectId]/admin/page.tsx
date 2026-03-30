"use client";

import { useParams } from "next/navigation";
import { PageShell } from "@/components/layout";
import { Card } from "@/components/ui/card";

export default function ProjectAdminPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  return (
    <PageShell variant="content" title="Admin" description="Project administration settings">
      <Card className="p-6">
        <p className="text-muted-foreground">
          Admin for project {projectId} - Coming soon
        </p>
      </Card>
    </PageShell>
  );
}
