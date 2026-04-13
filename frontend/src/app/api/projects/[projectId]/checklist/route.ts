import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const GET = withApiGuardrails<{ projectId: string }>(
  "projects/[projectId]/checklist#GET",
  async ({ request, params }) => {
  
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr, 10);
    const supabase = await createClient();

    // Check each feature for data existence
    const [
      { count: teamCount },
      { count: budgetCount },
      { count: contractsCount },
      { count: scheduleCount },
      { count: drawingsCount },
      { count: rfisCount },
      { count: primeChangeOrdersCount },
      { count: contractChangeOrdersCount },
      { count: submittalsCount },
    ] = await Promise.all([
      supabase
        .from("project_directory_memberships")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("budget_line_items")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("prime_contracts")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("schedule_tasks")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("drawings")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("rfis")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("prime_contract_change_orders")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase
        .from("contract_change_orders")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("submittals")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
    ]);

    const checklistStatus = {
      "setup-team": (teamCount || 0) > 0,
      "configure-budget": (budgetCount || 0) > 0,
      "add-contracts": (contractsCount || 0) > 0,
      "create-schedule": (scheduleCount || 0) > 0,
      "upload-drawings": (drawingsCount || 0) > 0,
      "setup-rfis": (rfisCount || 0) > 0,
      "setup-change-orders": (primeChangeOrdersCount || 0) + (contractChangeOrdersCount || 0) > 0,
      "setup-submittals": (submittalsCount || 0) > 0,
    };

    return NextResponse.json(checklistStatus);
    },
);
