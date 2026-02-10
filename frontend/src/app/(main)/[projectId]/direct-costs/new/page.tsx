import { CreateDirectCostForm } from "@/components/direct-costs/CreateDirectCostForm";
import { FormContainer, ProjectPageHeader } from "@/components/layout";

interface PageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function NewDirectCostPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = parseInt(resolvedParams.projectId);

  return (
    <>
      <ProjectPageHeader
        title="New Direct Cost"
        description="Create a new direct cost entry for this project"
      />
      <FormContainer maxWidth="xl" withCard={false}>
        <CreateDirectCostForm projectId={projectId} />
      </FormContainer>
    </>
  );
}
