import { createServiceClient } from "@/lib/supabase/service";
import { PageShell } from "@/components/layout";
import { notFound } from "next/navigation";
import { ProjectCommandCenter as ProjectHomeClient } from "./project-command-center";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface TeamMember {
  id: string;
  role: string;
  person_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  company_name: string;
  phone_office: string;
  phone_mobile: string;
}

interface HomeAlerts {
  hasPrimeContractWithoutFinancialMarkup: boolean;
  changeOrdersWithoutChangeRequestCount: number;
}

interface PendingSsovReview {
  commitmentId: string;
  commitmentNumber: string;
  commitmentTitle: string;
  submittedAt: string | null;
}

interface DirectoryTeamMemberRow {
  person_id: string;
  role: string | null;
  people: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    company: string | null;
    phone_business: string | null;
    phone_mobile: string | null;
  };
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseTeamMember(rawMember: unknown): Record<string, unknown> {
  if (typeof rawMember === "string") {
    try {
      const parsed = JSON.parse(rawMember) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { name: rawMember };
    }
    return { name: rawMember };
  }

  if (rawMember && typeof rawMember === "object" && !Array.isArray(rawMember)) {
    return rawMember as Record<string, unknown>;
  }

  return {};
}

function mapProjectTeamMembers(rawTeamMembers: unknown): TeamMember[] {
  if (!Array.isArray(rawTeamMembers)) return [];

  return rawTeamMembers
    .map((rawMember, index) => {
      const parsed = parseTeamMember(rawMember);
      const fullName = toStringValue(parsed.full_name) || toStringValue(parsed.name);
      const [firstName = "", ...lastNameParts] = fullName.split(/\s+/).filter(Boolean);
      const lastName = lastNameParts.join(" ");
      const role = toStringValue(parsed.role) || toStringValue(parsed.title) || "Team Member";
      const personId = toStringValue(parsed.person_id) || toStringValue(parsed.id);

      const fallbackIdBase = personId || fullName || `member-${index}`;
      const fallbackId = `project-team-${fallbackIdBase.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`;

      return {
        id: personId || fallbackId,
        role,
        person_id: personId,
        first_name: toStringValue(parsed.first_name) || firstName,
        last_name: toStringValue(parsed.last_name) || lastName,
        full_name: fullName || "Team Member",
        email: toStringValue(parsed.email),
        company_name: toStringValue(parsed.company) || toStringValue(parsed.company_name),
        phone_office: toStringValue(parsed.phone_office) || toStringValue(parsed.office),
        phone_mobile: toStringValue(parsed.phone_mobile) || toStringValue(parsed.phone) || toStringValue(parsed.mobile),
      } satisfies TeamMember;
    })
    .filter((member) => member.full_name.length > 0);
}

function mapDirectoryTeamMembers(rawMembers: unknown): TeamMember[] {
  if (!Array.isArray(rawMembers)) return [];

  return (rawMembers as DirectoryTeamMemberRow[]).map((member) => {
    const person = member.people;
    const firstName = person?.first_name?.trim() || "";
    const lastName = person?.last_name?.trim() || "";
    const fullName = `${firstName} ${lastName}`.trim() || "Team Member";

    return {
      id: person?.id || member.person_id,
      role: member.role?.trim() || "Team Member",
      person_id: person?.id || member.person_id,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      email: person?.email || "",
      company_name: person?.company || "",
      phone_office: person?.phone_business || "",
      phone_mobile: person?.phone_mobile || "",
    };
  });
}

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
    approvedSubcontractTotalsResult,
    approvedPurchaseOrderTotalsResult,
    contractsResult,
    contractLineItemsResult,
    budgetResult,
    changeEventsResult,
    scheduleResult,
    teamResult,
    teamDirectoryResult,
    verticalMarkupCountResult,
    primeCosWithoutChangeRequestCountResult,
    commitmentCosWithoutChangeRequestCountResult,
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
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    // Fetch approved/executed commitment totals for Home financial rollups
    supabase
      .from("subcontracts_with_totals")
      .select("id, total_sov_amount")
      .eq("project_id", numericProjectId)
      .in("status", ["Approved", "Complete", "Executed"]),

    supabase
      .from("purchase_orders_with_totals")
      .select("id, total_sov_amount")
      .eq("project_id", numericProjectId)
      .in("status", ["Approved", "Completed", "Executed"]),

    // Fetch prime contracts
    supabase
      .from("prime_contracts")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("created_at", { ascending: false }),

    // Fetch prime contract SOV line items for contract value rollups
    supabase
      .from("contract_line_items")
      .select("contract_id,total_cost,quantity,unit_cost,prime_contracts!inner(project_id)")
      .eq("prime_contracts.project_id", numericProjectId),

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
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),

    // Fetch schedule tasks
    supabase
      .from("schedule_tasks")
      .select("*")
      .eq("project_id", numericProjectId)
      .order("start_date", { ascending: true }),

    // Fetch project team roster
    supabase.rpc("get_project_team", { p_project_id: numericProjectId }),

    // Fetch active project directory memberships (source of truth for Home team)
    supabase
      .from("project_directory_memberships")
      .select(
        "person_id, role, people!inner(id, first_name, last_name, email, company, phone_business, phone_mobile)"
      )
      .eq("project_id", numericProjectId)
      .eq("status", "active")
      .limit(50),

    // Count project-level financial markup settings
    supabase
      .from("vertical_markup")
      .select("id", { count: "exact", head: true })
      .eq("project_id", numericProjectId),

    // Count prime contract change orders with no linked change request/event
    supabase
      .from("prime_contract_change_orders")
      .select("id", { count: "exact", head: true })
      .eq("project_id", numericProjectId)
      .is("change_event_id", null),

    // Count commitment change orders with no linked change request/event
    supabase
      .from("contract_change_orders")
      .select("id, prime_contracts!inner(project_id)", { count: "exact", head: true })
      .eq("prime_contracts.project_id", numericProjectId)
      .is("change_event_id", null),
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
    const { document_metadata, ...task } = row as TaskRow & { document_metadata: unknown };
    return task;
  });
  // Some rows can match multiple fetch paths (project_ids + project_id + metadata link).
  // Normalize to one task per id before sorting so Home never renders duplicates.
  const allTaskCandidates: TaskRow[] = [
    ...directTasks,
    ...directProjectIdTasks,
    ...linkedTasks,
  ];
  const tasksById = new Map<string, TaskRow>();
  for (const task of allTaskCandidates) {
    const existing = tasksById.get(task.id);
    if (!existing) {
      tasksById.set(task.id, task);
      continue;
    }
    if (new Date(task.created_at).getTime() > new Date(existing.created_at).getTime()) {
      tasksById.set(task.id, task);
    }
  }
  const tasks = Array.from(tasksById.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const meetings = meetingsResult.data || [];
  const changeOrders = [
    ...(primeChangeOrdersResult.data || []),
    ...(contractChangeOrdersResult.data || []),
  ];
  const rfis = rfisResult.data || [];
  const dailyLogs = dailyLogsResult.data || [];
  // Cast to expected format since commitments_unified is a view — deduplicate by id
  const rawCommitments = ((commitmentsResult.data || []) as unknown) as Array<{
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
  const seenCommitmentIds = new Set<string>();
  const commitments = rawCommitments.filter((c) => {
    if (seenCommitmentIds.has(c.id)) return false;
    seenCommitmentIds.add(c.id);
    return true;
  });

  const { data: pendingSsovRows } = await (supabase as any)
    .from("subcontractor_sov_submissions")
    .select("commitment_id, submitted_at")
    .eq("project_id", numericProjectId)
    .eq("status", "under_review")
    .order("submitted_at", { ascending: true });

  const pendingSsovReviews: PendingSsovReview[] = (pendingSsovRows || []).map(
    (row: { commitment_id: string; submitted_at: string | null }) => {
      const commitment = commitments.find((item) => item.id === row.commitment_id);
      return {
        commitmentId: row.commitment_id,
        commitmentNumber: commitment?.number || "",
        commitmentTitle: commitment?.title || "Commitment",
        submittedAt: row.submitted_at || null,
      };
    },
  );

  const commitmentTotal =
    (approvedSubcontractTotalsResult.data || []).reduce(
      (sum, row) => sum + (row.total_sov_amount ?? 0),
      0,
    ) +
    (approvedPurchaseOrderTotalsResult.data || []).reduce(
      (sum, row) => sum + (row.total_sov_amount ?? 0),
      0,
    );

  const contracts = contractsResult.data || [];
  const verticalMarkupCount = verticalMarkupCountResult.count || 0;
  const homeAlerts: HomeAlerts = {
    hasPrimeContractWithoutFinancialMarkup:
      contracts.length > 0 && verticalMarkupCount === 0,
    changeOrdersWithoutChangeRequestCount:
      (primeCosWithoutChangeRequestCountResult.count || 0) +
      (commitmentCosWithoutChangeRequestCountResult.count || 0),
  };
  const contractLineItems = contractLineItemsResult.data || [];
  const budget = budgetResult.data || [];
  const changeEvents = changeEventsResult.data || [];
  const schedule = scheduleResult.data || [];
  const teamFromRpc = teamResult.data || [];
  const teamFromDirectory = mapDirectoryTeamMembers(teamDirectoryResult.data || []);
  const teamFromProject = mapProjectTeamMembers(project.team_members);
  const team =
    teamFromDirectory.length > 0
      ? teamFromDirectory
      : teamFromRpc.length > 0
      ? teamFromRpc
      : teamFromProject;

  return (
    <PageShell
      variant="dashboard"
      title="Home"
      showHeader={false}
      className="pb-0 px-4 sm:px-6 lg:px-8"
      contentClassName="space-y-0"
    >
      <ProjectHomeClient
        project={project}
        tasks={tasks}
        meetings={meetings}
        changeOrders={changeOrders}
        rfis={rfis}
        dailyLogs={dailyLogs}
        commitments={commitments}
        commitmentTotal={commitmentTotal}
        contracts={contracts}
        contractLineItems={contractLineItems}
        budget={budget}
        changeEvents={changeEvents}
        schedule={schedule}
        team={team}
        homeAlerts={homeAlerts}
        pendingSsovReviews={pendingSsovReviews}
      />
    </PageShell>
  );
}
