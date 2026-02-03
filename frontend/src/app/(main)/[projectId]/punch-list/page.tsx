import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { PunchListPageWrapper } from "./punch-list-page-wrapper";

export default async function PunchListPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  return (
    <>
      <PageHeader
        title="Punch List"
        description="Track and manage punch list items"
      />
      <PageContainer>
        <PunchListPageWrapper projectId={numericProjectId} />
      </PageContainer>
    </>
  );
}
