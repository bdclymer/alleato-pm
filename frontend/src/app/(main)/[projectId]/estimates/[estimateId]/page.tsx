import { getProjectInfo } from "@/lib/supabase/project-fetcher";
import { EstimateDetailClientV2 } from "./estimate-detail-client-v2";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

type GcItem = Database["public"]["Tables"]["estimate_gc_items"]["Row"];
type DetailItem = Database["public"]["Tables"]["estimate_detail_items"]["Row"];
type SublistSub = Database["public"]["Tables"]["estimate_sublist_subs"]["Row"];

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

  // Fetch line items (kept for legacy compatibility / future use)
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

  // Fetch V2 data
  const { data: gcItems } = await supabase
    .from("estimate_gc_items")
    .select("*")
    .eq("estimate_id", estimateIdNum)
    .order("sort_order", { ascending: true });

  const { data: detailItems } = await supabase
    .from("estimate_detail_items")
    .select("*")
    .eq("estimate_id", estimateIdNum)
    .order("division_code", { ascending: true })
    .order("sort_order", { ascending: true });

  const { data: sublistSubs } = await supabase
    .from("estimate_sublist_subs")
    .select("*")
    .eq("estimate_id", estimateIdNum)
    .order("division_code", { ascending: true })
    .order("position", { ascending: true });

  return (
    <EstimateDetailClientV2
      projectId={projectId}
      projectName={project.name ?? `Project ${projectId}`}
      estimate={estimate}
      gcItems={(gcItems ?? []) as GcItem[]}
      detailItems={(detailItems ?? []) as DetailItem[]}
      sublistSubs={(sublistSubs ?? []) as SublistSub[]}
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
