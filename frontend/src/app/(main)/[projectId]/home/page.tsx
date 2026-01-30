import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { ProjectHomeClient } from "./project-home-client";

export default async function ProjectHomePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const supabase = createServiceClient();
  const { projectId } = await params;
  const numericProjectId = parseInt(projectId, 10);

  // Validate projectId is a valid number
  if (isNaN(numericProjectId)) {
    notFound();
  }

  // Fetch project data with all related information in parallel
  const [
    projectResult,
    tasksResult,
    meetingsResult,
    changeOrdersResult,
    rfisResult,
    dailyLogsResult,
    commitmentsResult,
    contractsResult,
    budgetResult,
    changeEventsResult,
    scheduleResult,
  ] = await Promise.all([
    // Fetch main project data
    supabase.from("projects").select("*").eq("id", numericProjectId).single(),

    // Fetch tasks
    supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", numericProjectId)
      .neq("status", "completed")
      .order("due_date", { ascending: true })
      .limit(4),

    // Fetch meetings from document_metadata
    supabase
      .from("document_metadata")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("date", { ascending: false })
      .limit(5),

    // Fetch change orders
    supabase
      .from("change_orders")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Fetch RFIs
    supabase
      .from("rfis")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Fetch daily logs/reports
    supabase
      .from("daily_logs")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("log_date", { ascending: false })
      .limit(5),

    // Fetch commitments from unified view (combines subcontracts + purchase_orders)
    supabase
      .from("commitments_unified")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false }),

    // Fetch contracts
    supabase
      .from("financial_contracts")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false }),

    // Fetch budget lines
    supabase
      .from("budget_lines")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("cost_code_id", { ascending: true }),

    // Fetch change events
    supabase
      .from("change_events")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false }),

    // Fetch schedule tasks
    supabase
      .from("schedule_tasks")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("start_date", { ascending: true }),
  ]);

  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data;
  const tasks = tasksResult.data || [];
  const meetings = meetingsResult.data || [];
  const changeOrders = changeOrdersResult.data || [];
  const rfis = rfisResult.data || [];
  const dailyLogs = dailyLogsResult.data || [];
  // Cast to expected format since commitments_unified is a view
  const commitments = ((commitmentsResult.data || []) as unknown) as Array<{
    id: string;
    project_id: number;
    number: string;
    contract_company_id: string | null;
    title: string | null;
    status: string;
    executed: boolean;
    type: "subcontract" | "purchase_order";
    contract_amount?: number;
    retention_percentage: number | null;
    start_date: string | null;
    executed_date: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
    original_amount?: number;
  }>;
  const contracts = contractsResult.data || [];
  const budget = budgetResult.data || [];
  const changeEvents = changeEventsResult.data || [];
  const schedule = scheduleResult.data || [];

  return (
    <ProjectHomeClient
      project={project}
      tasks={tasks}
      meetings={meetings}
      changeOrders={changeOrders}
      rfis={rfis}
      dailyLogs={dailyLogs}
      commitments={commitments}
      contracts={contracts}
      budget={budget}
      changeEvents={changeEvents}
      schedule={schedule}
    />
  );
}
