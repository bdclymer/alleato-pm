import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { ChangeOrdersClient } from "./change-orders-client";
import type { PrimeContractCO, CommitmentCO } from "@/features/change-orders/change-orders-table-config";

export default async function ProjectChangeOrdersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { numericProjectId, supabase } = await getProjectInfo(projectId);

  const [primeResponse, commitmentResponse] = await Promise.all([
    supabase
      .from("prime_contract_change_orders")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false }),

    supabase
      .from("contract_change_orders")
      .select(`
        *,
        prime_contracts!inner(project_id)
      `)
      .eq("prime_contracts.project_id", numericProjectId)
      .order("created_at", { ascending: false }),
  ]);

  if (primeResponse.error || commitmentResponse.error) {
    const error = primeResponse.error || commitmentResponse.error;
    console.error("Error loading change orders:", error);
    return <ChangeOrdersClient projectId={projectId} primeCOs={[]} commitmentCOs={[]} />;
  }

  const primeCOs: PrimeContractCO[] = (primeResponse.data || []).map((co) => ({
    id: co.id,
    pcco_number: co.pcco_number,
    title: co.title,
    status: co.status,
    total_amount: co.total_amount,
    contract_id: co.contract_id,
    prime_contract_id: co.prime_contract_id ?? null,
    executed: co.executed ?? false,
    submitted_at: co.submitted_at,
    approved_at: co.approved_at,
    created_at: co.created_at,
    project_id: co.project_id,
  }));

  const commitmentCOs: CommitmentCO[] = (commitmentResponse.data || []).map((co) => ({
    id: co.id,
    change_order_number: co.change_order_number,
    description: co.description,
    status: co.status,
    amount: co.amount,
    contract_id: co.contract_id,
    requested_by: co.requested_by,
    requested_date: co.requested_date,
    approved_by: co.approved_by,
    approved_date: co.approved_date,
    rejection_reason: co.rejection_reason,
    created_at: co.created_at,
  }));

  return (
    <ChangeOrdersClient
      projectId={projectId}
      primeCOs={primeCOs}
      commitmentCOs={commitmentCOs}
    />
  );
}
