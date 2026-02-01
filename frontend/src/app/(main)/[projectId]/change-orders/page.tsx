import Link from "next/link";
import { TableLayout } from "@/components/layouts";
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
      <TableLayout>
        <div className="text-center text-destructive p-6">
          Error loading change orders. Please try again later.
        </div>
      </TableLayout>
    );
  }

  const changeOrderRows = changeOrders || [];

  return (
    <TableLayout>
      <div className="flex items-center justify-end">
        <Button asChild data-testid="change-orders-create-button">
          <Link href={`/${projectId}/change-orders/new`}>Create Change Order</Link>
        </Button>
      </div>
      <ChangeOrdersClient
        projectId={projectId}
        changeOrders={changeOrderRows}
      />
    </TableLayout>
  );
}
