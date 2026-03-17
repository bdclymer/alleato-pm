import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { ChangeOrdersClient } from "./change-orders-client";

export default async function ProjectChangeOrdersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { numericProjectId, supabase } = await getProjectInfo(projectId);

  // Fetch from all three change order tables
  const [generalResponse, primeResponse, commitmentResponse] = await Promise.all([
    // General change_orders table
    supabase
      .from("change_orders")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false }),

    // Prime contract change orders — filter directly by project_id
    supabase
      .from("prime_contract_change_orders")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false }),

    // Commitment change orders (joined with prime_contracts to get project_id)
    supabase
      .from("contract_change_orders")
      .select(`
        *,
        prime_contracts!inner(project_id)
      `)
      .eq("prime_contracts.project_id", numericProjectId)
      .order("created_at", { ascending: false }),
  ]);

  if (generalResponse.error || primeResponse.error || commitmentResponse.error) {
    const error = generalResponse.error || primeResponse.error || commitmentResponse.error;
    console.error("Error loading change orders:", error);
    return <ChangeOrdersClient projectId={projectId} changeOrders={[]} />;
  }

  // Normalize and combine all change orders with contract type indicator
  const generalCOs = (generalResponse.data || []).map((co) => ({
    ...co,
    contractType: "general" as const,
    normalizedNumber: co.co_number,
    normalizedTitle: co.title,
    normalizedDescription: co.description,
    normalizedStatus: co.status,
    normalizedAmount: co.amount,
    normalizedCreatedAt: co.created_at,
    normalizedDueDate: co.due_date,
  }));

  const primeCOs = (primeResponse.data || []).map((co) => ({
    ...co,
    contractType: "prime" as const,
    normalizedNumber: co.pcco_number,
    normalizedTitle: co.title,
    normalizedDescription: null,
    normalizedStatus: co.status,
    normalizedAmount: co.total_amount,
    normalizedCreatedAt: co.created_at,
    normalizedDueDate: null,
  }));

  const commitmentCOs = (commitmentResponse.data || []).map((co) => ({
    ...co,
    contractType: "commitment" as const,
    normalizedNumber: co.change_order_number,
    normalizedTitle: co.description,
    normalizedDescription: co.description,
    normalizedStatus: co.status,
    normalizedAmount: co.amount,
    normalizedCreatedAt: co.created_at,
    normalizedDueDate: null,
  }));

  const changeOrderRows = [...generalCOs, ...primeCOs, ...commitmentCOs];

  return <ChangeOrdersClient projectId={projectId} changeOrders={changeOrderRows} />;
}
