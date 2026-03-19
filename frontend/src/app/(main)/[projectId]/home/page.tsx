import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { ProjectHomeRedesign as ProjectHomeClient } from "./project-home-redesign";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    tasksByProjectIdResult,
    tasksViaDocsResult,
    meetingsResult,
    primeChangeOrdersResult,
    contractChangeOrdersResult,
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

    // Fetch tasks — by project_ids array
    supabase
      .from("tasks")
      .select("*")
      .contains("project_ids", [numericProjectId])
      .not("status", "in", '("done","cancelled")')
      .order("created_at", { ascending: false })
      .limit(20),

    // Fetch tasks — by scalar project_id (legacy / partially backfilled rows)
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", numericProjectId)
      .not("status", "in", '("done","cancelled")')
      .order("created_at", { ascending: false })
      .limit(20),

    // Fetch tasks — via document_metadata link (for tasks with empty project_ids)
    supabase
      .from("tasks")
      .select("*, document_metadata!tasks_metadata_id_fkey!inner(project_id)")
      .eq("document_metadata.project_id", numericProjectId)
      .or("project_ids.is.null,project_ids.eq.{}")
      .not("status", "in", '("done","cancelled")')
      .order("created_at", { ascending: false })
      .limit(20),

    // Fetch meetings from document_metadata
    supabase
      .from("document_metadata")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("date", { ascending: false }),

    // Fetch prime contract change orders
    supabase
      .from("prime_contract_change_orders")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false })
      .limit(5),

    // Fetch contract (commitment) change orders via prime_contracts join
    supabase
      .from("contract_change_orders")
      .select("*, prime_contracts!inner(project_id)")
      .eq("prime_contracts.project_id", numericProjectId)
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

    // Fetch prime contracts
    supabase
      .from("prime_contracts")
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

  // Merge tasks from both queries (direct project_ids match + document_metadata link)
  // and deduplicate by id, keeping most-recent-first ordering
  type TaskRow = NonNullable<typeof tasksResult.data>[number];
  const directTasks: TaskRow[] = tasksResult.data || [];
  const directProjectIdTasks: TaskRow[] = tasksByProjectIdResult.data || [];
  const linkedTasksRaw = tasksViaDocsResult.data || [];
  // Strip the joined document_metadata field so shape matches TaskRow
  const linkedTasks: TaskRow[] = linkedTasksRaw.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { document_metadata, ...task } = row as TaskRow & { document_metadata: unknown };
    return task;
  });
  const mergedDirect = [...directTasks, ...directProjectIdTasks];
  const seenIds = new Set(mergedDirect.map((t) => t.id));
  const uniqueLinked = linkedTasks.filter((t) => !seenIds.has(t.id));
  const tasks = [...mergedDirect, ...uniqueLinked].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const meetings = meetingsResult.data || [];
  const changeOrders = [
    ...(primeChangeOrdersResult.data || []),
    ...(contractChangeOrdersResult.data || []),
  ];
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
