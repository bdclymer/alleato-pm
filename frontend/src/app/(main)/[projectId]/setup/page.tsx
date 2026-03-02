import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { ProjectSetupWizard } from "@/components/project-setup-wizard/project-setup-wizard";

interface ProjectSetupPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectSetupPage({
  params,
}: ProjectSetupPageProps) {
  const { projectId } = await params;
  return (
    <>
      <ProjectPageHeader
        title="Project Setup"
        description="Configure your project settings and details"
      />
      <PageContainer maxWidth="lg">
        <ProjectSetupWizard projectId={projectId} />
      </PageContainer>
    </>
  );
}
