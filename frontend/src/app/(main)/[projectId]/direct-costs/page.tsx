import Link from "next/link";
import { PageContainer } from "@/components/layout";
import { PageHeader } from "@/components/layout/page-header-unified";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { Button } from "@/components/ui/button";
import { DirectCostsClient } from "./direct-costs-client";
import type { DirectCostRow } from "./direct-costs-client";

export default async function ProjectDirectCostsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { numericProjectId, supabase } = await getProjectInfo(projectId);

  const { data: directCosts, error } = await supabase
    .from("direct_costs")
    .select(`
      *,
      vendor:vendors(name)
    `)
    .eq("project_id", numericProjectId)
    .order("date", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader
          title="Direct Costs"
          description="Track direct project expenses and invoices"
        />
        <PageContainer>
          <div className="text-center text-destructive p-6">
            Error loading direct costs. Please try again later.
          </div>
        </PageContainer>
      </>
    );
  }

  const directCostRows: DirectCostRow[] = (directCosts || []).map((row) => ({
    id: row.id,
    date: row.date,
    invoice_number: row.invoice_number,
    cost_type: row.cost_type,
    status: row.status,
    description: row.description,
    total_amount: row.total_amount,
    received_date: row.received_date,
    paid_date: row.paid_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    vendor: row.vendor as { name: string } | null,
  }));

  return (
    <>
      <PageHeader
        title="Direct Costs"
        description="Track direct project expenses and invoices"
        actions={
          <Button asChild size="sm" data-testid="direct-costs-create-button">
            <Link href={`/${projectId}/direct-costs/new`}>Add Direct Cost</Link>
          </Button>
        }
      />
      <PageContainer className="space-y-6">
        <DirectCostsClient
          projectId={projectId}
          directCosts={directCostRows}
        />
      </PageContainer>
    </>
  );
}
