import { CreateDirectCostForm } from "@/components/direct-costs/CreateDirectCostForm";
import { PageContainer, ProjectPageHeader } from "@/components/layout";

interface PageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function NewDirectCostPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = Number.parseInt(resolvedParams.projectId, 10);

  return (
    <>
      <ProjectPageHeader
        title="New Direct Cost"
        description="Create a new direct cost entry for this project"
      />
      <PageContainer>
        <CreateDirectCostForm projectId={projectId} />
      </PageContainer>
    </>
  );
}
