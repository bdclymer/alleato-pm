import { CreateDirectCostForm } from "@/components/direct-costs/CreateDirectCostForm";
import { PageShell } from "@/components/layout";

interface PageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export default async function NewDirectCostPage({ params }: PageProps) {
  const resolvedParams = await params;
  const projectId = Number.parseInt(resolvedParams.projectId, 10);

  return (
    <PageShell
      variant="form"
      title="New Direct Cost"
      description="Create a new direct cost entry for this project"
    >
      <CreateDirectCostForm projectId={projectId} />
    </PageShell>
  );
}
