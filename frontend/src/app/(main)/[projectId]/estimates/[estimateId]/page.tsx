import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { EstimateDetailClient } from "./estimate-detail-client";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; estimateId: string }>;
}) {
  const { projectId, estimateId } = await params;
  const { project, supabase } = await getProjectInfo(projectId);
  const estimateIdNum = parseInt(estimateId, 10);

  // Fetch estimate
  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .select("*")
    .eq("estimate_id", estimateIdNum)
    .eq("is_deleted", false)
    .single();

  if (estimateError || !estimate) {
    return (
      <div className="text-center text-destructive p-6">
        Estimate not found.
      </div>
    );
  }

  // Fetch line items
  const { data: lineItems } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", estimateIdNum)
    .order("sort_order", { ascending: true });

  // Fetch division totals
  const { data: divisionTotals } = await supabase
    .from("v_estimate_division_totals")
    .select("*")
    .eq("estimate_id", estimateIdNum);

  // Fetch alternates
  const { data: alternates } = await supabase
    .from("estimate_alternates")
    .select("*")
    .eq("estimate_id", estimateIdNum)
    .order("sort_order", { ascending: true });

  // Fetch allowances
  const { data: allowances } = await supabase
    .from("estimate_allowances")
    .select("*")
    .eq("estimate_id", estimateIdNum)
    .order("sort_order", { ascending: true });

  return (
    <EstimateDetailClient
      projectId={projectId}
      projectName={project.name ?? `Project ${projectId}`}
      estimate={estimate}
      lineItems={lineItems || []}
      divisionTotals={
        (divisionTotals || []).map((d) => ({
          division_code: d.division_code as string,
          division_name: d.division_name as string,
          material_total: Number(d.material_total) || 0,
          labor_total: Number(d.labor_total) || 0,
          equipment_total: Number(d.equipment_total) || 0,
          subcontract_total: Number(d.subcontract_total) || 0,
          division_total: Number(d.division_total) || 0,
          line_count: Number(d.line_count) || 0,
        }))
      }
      alternates={alternates || []}
      allowances={allowances || []}
    />
  );
}
