import Link from "next/link";
import { PageContainer, ProjectPageHeader } from "@/components/layout";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { Button } from "@/components/ui/button";
import { ChangeOrdersClient } from "./change-orders-client";

export default async function ProjectChangeOrdersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { numericProjectId, supabase } = await getProjectInfo(projectId);

  const { data: changeOrders, error } = await supabase
    .from("change_orders")
    .select("*")
    .eq("project_id", numericProjectId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <ProjectPageHeader
          title="Change Orders"
          description="Track and manage contract change orders"
        />
        <PageContainer>
          <div className="text-center text-destructive p-6">
            Error loading change orders. Please try again later.
          </div>
        </PageContainer>
      </>
    );
  }

  const changeOrderRows = changeOrders || [];

  return (
    <>
      <ProjectPageHeader
        title="Change Orders"
        description="Track and manage contract change orders"
        actions={
          <Button asChild size="sm" data-testid="change-orders-create-button">
            <Link href={`/${projectId}/change-orders/new`}>Create Change Order</Link>
          </Button>
        }
      />
      <PageContainer className="space-y-6">
        <ChangeOrdersClient
          projectId={projectId}
          changeOrders={changeOrderRows}
        />
      </PageContainer>
    </>
  );
}
