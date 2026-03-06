import { tool } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import OpenAI from "openai";

type AnyRow = Record<string, unknown>;

type ToolTracePayload = {
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  timestamp: string;
};

type CreateOperationalToolsOptions = {
  onTrace?: (trace: ToolTracePayload) => void;
};

function asNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function withTrace<TInput extends Record<string, unknown>, TResult>(
  name: string,
  options: CreateOperationalToolsOptions,
  execute: (input: TInput) => Promise<TResult>,
) {
  return async (input: TInput): Promise<TResult> => {
    try {
      const output = await execute(input);
      options.onTrace?.({
        tool: name,
        input,
        output,
        timestamp: new Date().toISOString(),
      });
      return output;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown tool error";
      options.onTrace?.({
        tool: name,
        input,
        error: message,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveProject(
  supabase: ReturnType<typeof createServiceClient>,
  projectId?: number,
  projectName?: string,
): Promise<{ id: number; name: string } | { error: string }> {
  if (projectId) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .single();
    if (error || !data) return { error: `Project ${projectId} not found` };
    return { id: data.id, name: data.name ?? "" };
  }
  if (projectName) {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name")
      .ilike("name", `%${projectName}%`)
      .limit(1)
      .single();
    if (error || !data)
      return { error: `No project found matching "${projectName}"` };
    return { id: data.id, name: data.name ?? "" };
  }
  return { error: "Provide either projectId or projectName" };
}

/** Lazy OpenAI client for embedding generation. */
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOperationalTools(
  _userId: string,
  options: CreateOperationalToolsOptions = {},
) {
  const supabase = createServiceClient();

  return {
    // -----------------------------------------------------------------------
    // 1. Schedule Analysis
    // -----------------------------------------------------------------------
    getScheduleAnalysis: tool({
      description:
        "Analyze the project schedule: overdue tasks, milestones at risk, " +
        "critical path items, completion percentage, and task dependencies. " +
        "Use when asked about schedule, timeline, delays, milestones, " +
        "or task progress for a project.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
      }),
      execute: withTrace(
        "getScheduleAnalysis",
        options,
        async ({ projectId, projectName }) => {
          const resolved = await resolveProject(
            supabase,
            projectId,
            projectName,
          );
          if ("error" in resolved) return resolved;

          const tasksRes = await supabase
            .from("schedule_tasks")
            .select("*")
            .eq("project_id", resolved.id)
            .order("start_date", { ascending: true })
            .limit(200);

          const tasks = (tasksRes.data ?? []) as AnyRow[];

          // schedule_dependencies has no project_id column, so
          // fetch deps scoped to the task IDs we already loaded
          const taskIds = tasks.map((t) => t.id as string);
          let deps: AnyRow[] = [];
          if (taskIds.length > 0) {
            const depsRes = await supabase
              .from("schedule_dependencies")
              .select("*")
              .in("task_id", taskIds)
              .limit(1000);
            deps = (depsRes.data ?? []) as AnyRow[];
          }
          const now = new Date().toISOString().split("T")[0];

          // Analytics
          const totalTasks = tasks.length;
          const completedTasks = tasks.filter(
            (t) =>
              t.status === "completed" || asNumber(t.percent_complete) >= 100,
          );
          const overdueTasks = tasks.filter(
            (t) =>
              t.finish_date &&
              (t.finish_date as string) < now &&
              t.status !== "completed" &&
              asNumber(t.percent_complete) < 100,
          );
          const milestones = tasks.filter((t) => t.is_milestone);
          const milestonesAtRisk = milestones.filter(
            (t) =>
              t.finish_date &&
              (t.finish_date as string) < now &&
              t.status !== "completed",
          );
          const upcomingMilestones = milestones
            .filter(
              (t) =>
                t.finish_date &&
                (t.finish_date as string) >= now &&
                t.status !== "completed",
            )
            .slice(0, 10);

          // Average completion
          const avgCompletion =
            totalTasks > 0
              ? Math.round(
                  tasks.reduce(
                    (sum, t) => sum + asNumber(t.percent_complete),
                    0,
                  ) / totalTasks,
                )
              : 0;

          // Tasks starting soon (next 14 days)
          const twoWeeksOut = new Date();
          twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
          const twoWeeksStr = twoWeeksOut.toISOString().split("T")[0];
          const upcomingTasks = tasks.filter(
            (t) =>
              t.start_date &&
              (t.start_date as string) >= now &&
              (t.start_date as string) <= twoWeeksStr &&
              t.status !== "completed",
          );

          // Dependency count per task (most dependencies = most critical)
          const depCountMap = new Map<number, number>();
          deps.forEach((d) => {
            const taskId = d.task_id as number;
            depCountMap.set(taskId, (depCountMap.get(taskId) ?? 0) + 1);
          });
          const criticalTasks = tasks
            .filter((t) => (depCountMap.get(t.id as number) ?? 0) > 0)
            .sort(
              (a, b) =>
                (depCountMap.get(b.id as number) ?? 0) -
                (depCountMap.get(a.id as number) ?? 0),
            )
            .slice(0, 10);

          return {
            project: { id: resolved.id, name: resolved.name },
            summary: {
              totalTasks,
              completedTasks: completedTasks.length,
              overdueTasks: overdueTasks.length,
              totalMilestones: milestones.length,
              milestonesAtRisk: milestonesAtRisk.length,
              avgCompletionPct: avgCompletion,
              totalDependencies: deps.length,
              upcomingTasksNext14Days: upcomingTasks.length,
            },
            overdueTasks: overdueTasks.slice(0, 15).map((t) => ({
              name: t.name,
              finishDate: t.finish_date,
              percentComplete: t.percent_complete,
              status: t.status,
              isMilestone: t.is_milestone,
              wbsCode: t.wbs_code,
            })),
            milestonesAtRisk: milestonesAtRisk.map((t) => ({
              name: t.name,
              finishDate: t.finish_date,
              percentComplete: t.percent_complete,
            })),
            upcomingMilestones: upcomingMilestones.map((t) => ({
              name: t.name,
              finishDate: t.finish_date,
              percentComplete: t.percent_complete,
            })),
            criticalPathItems: criticalTasks.map((t) => ({
              name: t.name,
              startDate: t.start_date,
              finishDate: t.finish_date,
              percentComplete: t.percent_complete,
              dependencyCount: depCountMap.get(t.id as number) ?? 0,
              status: t.status,
            })),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 2. People & Roles
    // -----------------------------------------------------------------------
    getPeopleAndRoles: tool({
      description:
        "Get the project directory: who is on a project, their roles, " +
        "companies, and contact information. Use when asked about team " +
        "members, contacts, who works on a project, or project personnel.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
        role: z
          .string()
          .optional()
          .describe("Filter by role (e.g. 'Project Manager')"),
      }),
      execute: withTrace(
        "getPeopleAndRoles",
        options,
        async ({ projectId, projectName, role }) => {
          const resolved = await resolveProject(
            supabase,
            projectId,
            projectName,
          );
          if ("error" in resolved) return resolved;

          // Fetch memberships with people data
          let memberQuery = supabase
            .from("project_directory_memberships")
            .select(
              "person_id, role, user_type, status, " +
                "people(id, first_name, last_name, email, job_title, " +
                "phone_mobile, phone_business, person_type, " +
                "companies(id, name))",
            )
            .eq("project_id", resolved.id)
            .eq("status", "active");

          if (role) {
            memberQuery = memberQuery.ilike("role", `%${role}%`);
          }

          const { data: members, error } = await memberQuery.limit(100);
          if (error) return { error: error.message };

          const memberRows = (members ?? []) as unknown as AnyRow[];

          // Group by role
          const byRole = new Map<string, AnyRow[]>();
          memberRows.forEach((m) => {
            const r = (m.role as string) ?? "Unassigned";
            const arr = byRole.get(r) || [];
            arr.push(m);
            byRole.set(r, arr);
          });

          const roleBreakdown = Array.from(byRole.entries()).map(
            ([roleName, members]) => ({
              role: roleName,
              count: members.length,
              members: members.map((m) => {
                const person = m.people as AnyRow | null;
                const company = person?.companies as AnyRow | null;
                return {
                  name: person
                    ? `${person.first_name ?? ""} ${person.last_name ?? ""}`.trim()
                    : "Unknown",
                  email: person?.email,
                  jobTitle: person?.job_title,
                  phone: person?.phone_mobile ?? person?.phone_business,
                  company: company?.name ?? null,
                  userType: m.user_type,
                };
              }),
            }),
          );

          return {
            project: { id: resolved.id, name: resolved.name },
            totalMembers: memberRows.length,
            roleBreakdown,
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 3. Vendor Performance
    // -----------------------------------------------------------------------
    getVendorPerformance: tool({
      description:
        "Analyze vendor/subcontractor performance across a project or portfolio. " +
        "Shows active vendors, their contract values, change order exposure, " +
        "and billing status. Use when asked about vendor performance, " +
        "subcontractor status, or trade partner metrics.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
        vendorName: z
          .string()
          .optional()
          .describe("Filter to a specific vendor by name"),
      }),
      execute: withTrace(
        "getVendorPerformance",
        options,
        async ({ projectId, projectName, vendorName }) => {
          // Optional project scoping
          let resolvedId: number | undefined;
          let resolvedName: string | undefined;
          if (projectId || projectName) {
            const resolved = await resolveProject(
              supabase,
              projectId,
              projectName,
            );
            if ("error" in resolved) return resolved;
            resolvedId = resolved.id;
            resolvedName = resolved.name;
          }

          // Fetch vendors
          let vendorQuery = supabase
            .from("vendors")
            .select("id, name, is_active, contact_name, contact_email")
            .eq("is_active", true)
            .limit(100);

          if (vendorName) {
            vendorQuery = vendorQuery.ilike("name", `%${vendorName}%`);
          }

          const { data: vendorRows } = await vendorQuery;
          const vendors = (vendorRows ?? []) as AnyRow[];

          // Fetch subcontracts for commitment data
          let subQuery = supabase
            .from("subcontracts")
            .select(
              "id, title, status, contract_company_id, " +
                "project_id, created_at",
            )
            .is("deleted_at", null);

          if (resolvedId) {
            subQuery = subQuery.eq("project_id", resolvedId);
          }

          const { data: subRows } = await subQuery.limit(200);
          const subs = (subRows ?? []) as unknown as AnyRow[];

          // Fetch SOVs for financial data on subcontracts
          const subIds = subs.map((s) => s.id as string).filter(Boolean);
          let sovData: AnyRow[] = [];
          if (subIds.length > 0) {
            const { data } = await supabase
              .from("schedule_of_values")
              .select("id, commitment_id, total_amount, status")
              .in("commitment_id", subIds);
            sovData = (data ?? []) as unknown as AnyRow[];
          }

          // Index SOVs by commitment_id
          const sovByCommitment = new Map<string, AnyRow>();
          sovData.forEach((s) => {
            if (s.commitment_id) sovByCommitment.set(s.commitment_id as string, s);
          });

          // Build vendor performance map
          const vendorMap = new Map<number, AnyRow>();
          vendors.forEach((v) => vendorMap.set(v.id as number, v));

          const vendorPerformance = new Map<
            string,
            {
              vendor: AnyRow;
              contracts: number;
              totalContractValue: number;
            }
          >();

          subs.forEach((sub) => {
            const companyId = sub.contract_company_id as string;
            if (!companyId) return;

            const existing = vendorPerformance.get(companyId) ?? {
              vendor: vendorMap.get(Number(companyId)) ?? {
                id: companyId,
                name: "Unknown",
              },
              contracts: 0,
              totalContractValue: 0,
            };

            existing.contracts += 1;
            const sov = sovByCommitment.get(sub.id as string);
            if (sov) {
              existing.totalContractValue += asNumber(sov.total_amount);
            }

            vendorPerformance.set(companyId, existing);
          });

          // Sort by total value descending
          const ranked = Array.from(vendorPerformance.values()).sort(
            (a, b) => b.totalContractValue - a.totalContractValue,
          );

          const totalCommittedValue = ranked.reduce(
            (sum, v) => sum + v.totalContractValue,
            0,
          );

          return {
            project: resolvedId
              ? { id: resolvedId, name: resolvedName }
              : null,
            portfolioSummary: {
              totalVendors: ranked.length,
              totalCommittedValue,
              totalContracts: subs.length,
            },
            vendors: ranked.slice(0, 25).map((v) => ({
              vendorName: v.vendor.name,
              contactName: v.vendor.contact_name,
              contactEmail: v.vendor.contact_email,
              contractCount: v.contracts,
              totalContractValue: v.totalContractValue,
            })),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 4. RFI Status
    // -----------------------------------------------------------------------
    getRFIStatus: tool({
      description:
        "Analyze RFI (Request for Information) status for a project. " +
        "Shows overdue RFIs, response times, ball-in-court distribution, " +
        "cost/schedule impacts, and status breakdown. Use when asked about " +
        "RFIs, questions pending, or information requests.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
        status: z
          .string()
          .optional()
          .describe("Filter by status (e.g. 'open', 'closed')"),
      }),
      execute: withTrace(
        "getRFIStatus",
        options,
        async ({ projectId, projectName, status }) => {
          const resolved = await resolveProject(
            supabase,
            projectId,
            projectName,
          );
          if ("error" in resolved) return resolved;

          let rfiQuery = supabase
            .from("rfis")
            .select("*")
            .eq("project_id", resolved.id)
            .order("created_at", { ascending: false })
            .limit(200);

          if (status) {
            rfiQuery = rfiQuery.ilike("status", `%${status}%`);
          }

          const { data: rfiRows, error } = await rfiQuery;
          if (error) return { error: error.message };

          const rfis = (rfiRows ?? []) as AnyRow[];
          const now = new Date().toISOString().split("T")[0];

          // Status breakdown
          const statusCounts = new Map<string, number>();
          rfis.forEach((r) => {
            const s = (r.status as string) ?? "unknown";
            statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
          });

          // Overdue (open + past due date)
          const openRfis = rfis.filter(
            (r) =>
              (r.status as string) !== "closed" &&
              (r.status as string) !== "Closed",
          );
          const overdueRfis = openRfis.filter(
            (r) => r.due_date && (r.due_date as string) < now,
          );

          // Ball-in-court distribution
          const bicCounts = new Map<string, number>();
          openRfis.forEach((r) => {
            const bic = (r.ball_in_court as string) ?? "Unassigned";
            bicCounts.set(bic, (bicCounts.get(bic) ?? 0) + 1);
          });

          // Cost and schedule impact flags
          const withCostImpact = rfis.filter(
            (r) => r.cost_impact && r.cost_impact !== "No" && r.cost_impact !== "no",
          );
          const withScheduleImpact = rfis.filter(
            (r) =>
              r.schedule_impact &&
              r.schedule_impact !== "No" &&
              r.schedule_impact !== "no",
          );

          // Average days open for closed RFIs
          const closedRfis = rfis.filter(
            (r) =>
              (r.status as string) === "closed" ||
              (r.status as string) === "Closed",
          );
          let avgDaysToClose = 0;
          if (closedRfis.length > 0) {
            const totalDays = closedRfis.reduce((sum, r) => {
              if (r.created_at && r.closed_at) {
                const created = new Date(r.created_at as string);
                const closed = new Date(r.closed_at as string);
                return (
                  sum +
                  Math.round(
                    (closed.getTime() - created.getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                );
              }
              return sum;
            }, 0);
            avgDaysToClose = Math.round(totalDays / closedRfis.length);
          }

          return {
            project: { id: resolved.id, name: resolved.name },
            summary: {
              totalRFIs: rfis.length,
              openRFIs: openRfis.length,
              closedRFIs: closedRfis.length,
              overdueRFIs: overdueRfis.length,
              withCostImpact: withCostImpact.length,
              withScheduleImpact: withScheduleImpact.length,
              avgDaysToClose,
            },
            statusBreakdown: Object.fromEntries(statusCounts),
            ballInCourtDistribution: Object.fromEntries(bicCounts),
            overdueRFIs: overdueRfis.slice(0, 15).map((r) => ({
              number: r.number,
              subject: r.subject,
              dueDate: r.due_date,
              ballInCourt: r.ball_in_court,
              costImpact: r.cost_impact,
              scheduleImpact: r.schedule_impact,
              responsibleContractor: r.responsible_contractor,
            })),
            recentRFIs: rfis.slice(0, 10).map((r) => ({
              number: r.number,
              subject: r.subject,
              status: r.status,
              dueDate: r.due_date,
              ballInCourt: r.ball_in_court,
              createdAt: r.created_at,
            })),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 5. Submittal Status
    // -----------------------------------------------------------------------
    getSubmittalStatus: tool({
      description:
        "Analyze submittal status for a project. Shows overdue submittals, " +
        "approval pipeline, ball-in-court distribution, lead times, and " +
        "status breakdown. Use when asked about submittals, approvals, " +
        "material submissions, or shop drawings.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
        status: z
          .string()
          .optional()
          .describe("Filter by status (e.g. 'pending', 'approved')"),
      }),
      execute: withTrace(
        "getSubmittalStatus",
        options,
        async ({ projectId, projectName, status }) => {
          const resolved = await resolveProject(
            supabase,
            projectId,
            projectName,
          );
          if ("error" in resolved) return resolved;

          let subQuery = supabase
            .from("submittals")
            .select("*")
            .eq("project_id", resolved.id)
            .order("created_at", { ascending: false })
            .limit(200);

          if (status) {
            subQuery = subQuery.ilike("status", `%${status}%`);
          }

          const { data: subRows, error } = await subQuery;
          if (error) return { error: error.message };

          const submittals = (subRows ?? []) as AnyRow[];
          const now = new Date().toISOString().split("T")[0];

          // Status breakdown
          const statusCounts = new Map<string, number>();
          submittals.forEach((s) => {
            const st = (s.status as string) ?? "unknown";
            statusCounts.set(st, (statusCounts.get(st) ?? 0) + 1);
          });

          // Open submittals (not approved/closed)
          const openSubmittals = submittals.filter(
            (s) =>
              (s.status as string) !== "approved" &&
              (s.status as string) !== "Approved" &&
              (s.status as string) !== "closed" &&
              (s.status as string) !== "Closed",
          );

          // Overdue (required_approval_date or required_on_site_date past)
          const overdueSubmittals = openSubmittals.filter(
            (s) =>
              (s.required_approval_date &&
                (s.required_approval_date as string) < now) ||
              (s.required_on_site_date &&
                (s.required_on_site_date as string) < now),
          );

          // Ball-in-court distribution
          const bicCounts = new Map<string, number>();
          openSubmittals.forEach((s) => {
            const bic = (s.ball_in_court as string) ?? "Unassigned";
            bicCounts.set(bic, (bicCounts.get(bic) ?? 0) + 1);
          });

          // Priority distribution
          const priorityCounts = new Map<string, number>();
          submittals.forEach((s) => {
            const p = (s.priority as string) ?? "Normal";
            priorityCounts.set(p, (priorityCounts.get(p) ?? 0) + 1);
          });

          // Division/spec section distribution
          const divisionCounts = new Map<string, number>();
          submittals.forEach((s) => {
            const d = (s.division as string) ?? (s.specification_section as string) ?? "Unclassified";
            divisionCounts.set(d, (divisionCounts.get(d) ?? 0) + 1);
          });

          return {
            project: { id: resolved.id, name: resolved.name },
            summary: {
              totalSubmittals: submittals.length,
              openSubmittals: openSubmittals.length,
              overdueSubmittals: overdueSubmittals.length,
            },
            statusBreakdown: Object.fromEntries(statusCounts),
            ballInCourtDistribution: Object.fromEntries(bicCounts),
            priorityDistribution: Object.fromEntries(priorityCounts),
            divisionBreakdown: Object.fromEntries(
              Array.from(divisionCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15),
            ),
            overdueSubmittals: overdueSubmittals.slice(0, 15).map((s) => ({
              number: s.submittal_number,
              title: s.title,
              status: s.status,
              ballInCourt: s.ball_in_court,
              requiredApprovalDate: s.required_approval_date,
              requiredOnSiteDate: s.required_on_site_date,
              submitterCompany: s.submitter_company,
              priority: s.priority,
              division: s.division,
            })),
            recentSubmittals: submittals.slice(0, 10).map((s) => ({
              number: s.submittal_number,
              title: s.title,
              status: s.status,
              ballInCourt: s.ball_in_court,
              submissionDate: s.submission_date,
              leadTime: s.lead_time,
            })),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 6. Cross-Project Comparison
    // -----------------------------------------------------------------------
    getCrossProjectComparison: tool({
      description:
        "Compare key metrics across multiple projects side-by-side: " +
        "budget, schedule, RFI/submittal counts, change order exposure, " +
        "and health status. Use when asked to compare projects or see " +
        "which project has the most risk, biggest budget, etc.",
      inputSchema: z.object({
        projectIds: z
          .array(z.number())
          .optional()
          .describe("Specific project IDs to compare"),
        phase: z
          .string()
          .optional()
          .default("Current")
          .describe("Filter by phase if no projectIds given"),
      }),
      execute: withTrace(
        "getCrossProjectComparison",
        options,
        async ({ projectIds, phase }) => {
          // Get projects
          let projQuery = supabase
            .from("projects")
            .select("id, name, phase, health_status, health_score, budget, budget_used, completion_percentage")
            .eq("archived", false)
            .order("name", { ascending: true })
            .limit(30);

          if (projectIds && projectIds.length > 0) {
            projQuery = projQuery.in("id", projectIds);
          } else if (phase && phase !== "all") {
            projQuery = projQuery.eq("phase", phase);
          }

          const { data: projRows } = await projQuery;
          const projects = (projRows ?? []) as AnyRow[];
          const pIds = projects.map((p) => p.id as number);

          if (pIds.length === 0) {
            return { error: "No projects found matching criteria" };
          }

          // Parallel fetch across all projects
          const [financialRes, rfiRes, submittalRes, taskRes, ceRes] =
            await Promise.all([
              supabase
                .from("prime_contract_financial_summary")
                .select("project_id, original_contract_amount, revised_contract_amount, pending_change_orders, approved_change_orders")
                .in("project_id", pIds),
              supabase
                .from("rfis")
                .select("project_id, status, due_date")
                .in("project_id", pIds),
              supabase
                .from("submittals")
                .select("project_id, status")
                .in("project_id", pIds),
              supabase
                .from("schedule_tasks")
                .select("project_id, status, finish_date, percent_complete, is_milestone")
                .in("project_id", pIds),
              supabase
                .from("change_events_summary")
                .select("project_id, status")
                .in("project_id", pIds),
            ]);

          const now = new Date().toISOString().split("T")[0];

          // Index by project
          const rfisByProject = new Map<number, AnyRow[]>();
          (rfiRes.data ?? []).forEach((r: AnyRow) => {
            const pid = r.project_id as number;
            const arr = rfisByProject.get(pid) || [];
            arr.push(r);
            rfisByProject.set(pid, arr);
          });

          const submittalsByProject = new Map<number, AnyRow[]>();
          (submittalRes.data ?? []).forEach((s: AnyRow) => {
            const pid = s.project_id as number;
            const arr = submittalsByProject.get(pid) || [];
            arr.push(s);
            submittalsByProject.set(pid, arr);
          });

          const tasksByProject = new Map<number, AnyRow[]>();
          (taskRes.data ?? []).forEach((t: AnyRow) => {
            const pid = t.project_id as number;
            const arr = tasksByProject.get(pid) || [];
            arr.push(t);
            tasksByProject.set(pid, arr);
          });

          const finByProject = new Map<number, AnyRow[]>();
          (financialRes.data ?? []).forEach((f: AnyRow) => {
            const pid = f.project_id as number;
            const arr = finByProject.get(pid) || [];
            arr.push(f);
            finByProject.set(pid, arr);
          });

          const ceByProject = new Map<number, AnyRow[]>();
          (ceRes.data ?? []).forEach((c: AnyRow) => {
            const pid = c.project_id as number;
            const arr = ceByProject.get(pid) || [];
            arr.push(c);
            ceByProject.set(pid, arr);
          });

          // Build comparison rows
          const comparison = projects.map((p) => {
            const pid = p.id as number;
            const rfis = rfisByProject.get(pid) ?? [];
            const subs = submittalsByProject.get(pid) ?? [];
            const tasks = tasksByProject.get(pid) ?? [];
            const fins = finByProject.get(pid) ?? [];
            const ces = ceByProject.get(pid) ?? [];

            const openRfis = rfis.filter(
              (r) => (r.status as string) !== "closed" && (r.status as string) !== "Closed",
            );
            const overdueRfis = openRfis.filter(
              (r) => r.due_date && (r.due_date as string) < now,
            );
            const overdueTasks = tasks.filter(
              (t) =>
                t.finish_date &&
                (t.finish_date as string) < now &&
                t.status !== "completed" &&
                asNumber(t.percent_complete) < 100,
            );
            const contractValue = fins.reduce(
              (sum, f) =>
                sum + asNumber(f.revised_contract_amount ?? f.original_contract_amount),
              0,
            );
            const pendingCOs = fins.reduce(
              (sum, f) => sum + asNumber(f.pending_change_orders),
              0,
            );
            const openCEs = ces.filter(
              (c) => (c.status as string) !== "closed" && (c.status as string) !== "void",
            );

            return {
              projectId: pid,
              projectName: p.name,
              phase: p.phase,
              healthStatus: p.health_status,
              healthScore: p.health_score,
              completionPct: p.completion_percentage,
              contractValue,
              pendingChangeOrders: pendingCOs,
              openChangeEvents: openCEs.length,
              totalTasks: tasks.length,
              overdueTasks: overdueTasks.length,
              totalRFIs: rfis.length,
              openRFIs: openRfis.length,
              overdueRFIs: overdueRfis.length,
              totalSubmittals: subs.length,
            };
          });

          // Sort by risk (overdue items descending)
          comparison.sort(
            (a, b) =>
              b.overdueTasks + b.overdueRFIs - (a.overdueTasks + a.overdueRFIs),
          );

          return {
            projectCount: comparison.length,
            comparison,
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 7. Historical Trends
    // -----------------------------------------------------------------------
    getHistoricalTrends: tool({
      description:
        "Analyze how a project's metrics have changed over time: " +
        "RFI creation trends, submittal pipeline velocity, change order " +
        "trends, and schedule progress. Use when asked about trends, " +
        "velocity, trajectory, or how things have changed.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
        months: z
          .number()
          .optional()
          .default(6)
          .describe("How many months of history to analyze"),
      }),
      execute: withTrace(
        "getHistoricalTrends",
        options,
        async ({ projectId, projectName, months }) => {
          const resolved = await resolveProject(
            supabase,
            projectId,
            projectName,
          );
          if ("error" in resolved) return resolved;

          const lookbackDate = new Date();
          lookbackDate.setMonth(lookbackDate.getMonth() - (months ?? 6));
          const lookbackStr = lookbackDate.toISOString();

          // Fetch time-series data
          const [rfiRes, submittalRes, coRes, insightRes] = await Promise.all([
            supabase
              .from("rfis")
              .select("id, status, created_at, due_date")
              .eq("project_id", resolved.id)
              .gte("created_at", lookbackStr)
              .order("created_at", { ascending: true })
              .limit(500),
            supabase
              .from("submittals")
              .select("id, status, created_at, submission_date")
              .eq("project_id", resolved.id)
              .gte("created_at", lookbackStr)
              .order("created_at", { ascending: true })
              .limit(500),
            supabase
              .from("change_orders")
              .select("id, status, amount, created_at")
              .eq("project_id", resolved.id)
              .gte("created_at", lookbackStr)
              .order("created_at", { ascending: true })
              .limit(200),
            supabase
              .from("ai_insights")
              .select("id, severity, created_at, insight_type")
              .eq("project_id", resolved.id)
              .gte("created_at", lookbackStr)
              .order("created_at", { ascending: true })
              .limit(500),
          ]);

          const rfis = (rfiRes.data ?? []) as AnyRow[];
          const submittals = (submittalRes.data ?? []) as AnyRow[];
          const cos = (coRes.data ?? []) as AnyRow[];
          const insights = (insightRes.data ?? []) as AnyRow[];

          // Monthly aggregation helper
          function monthKey(dateStr: string): string {
            const d = new Date(dateStr);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          }

          // RFI trends by month
          const rfiByMonth = new Map<string, number>();
          rfis.forEach((r) => {
            if (r.created_at) {
              const key = monthKey(r.created_at as string);
              rfiByMonth.set(key, (rfiByMonth.get(key) ?? 0) + 1);
            }
          });

          // Submittal trends by month
          const subByMonth = new Map<string, number>();
          submittals.forEach((s) => {
            if (s.created_at) {
              const key = monthKey(s.created_at as string);
              subByMonth.set(key, (subByMonth.get(key) ?? 0) + 1);
            }
          });

          // CO trends by month with cumulative value
          const coByMonth = new Map<string, { count: number; value: number }>();
          cos.forEach((co) => {
            if (co.created_at) {
              const key = monthKey(co.created_at as string);
              const existing = coByMonth.get(key) ?? { count: 0, value: 0 };
              existing.count += 1;
              existing.value += asNumber(co.amount);
              coByMonth.set(key, existing);
            }
          });

          // Insight trends by month
          const insightByMonth = new Map<
            string,
            { total: number; critical: number }
          >();
          insights.forEach((i) => {
            if (i.created_at) {
              const key = monthKey(i.created_at as string);
              const existing = insightByMonth.get(key) ?? {
                total: 0,
                critical: 0,
              };
              existing.total += 1;
              if (
                i.severity === "critical" ||
                i.severity === "high"
              ) {
                existing.critical += 1;
              }
              insightByMonth.set(key, existing);
            }
          });

          // Build sorted monthly timeline
          const allMonths = new Set([
            ...rfiByMonth.keys(),
            ...subByMonth.keys(),
            ...coByMonth.keys(),
            ...insightByMonth.keys(),
          ]);
          const sortedMonths = Array.from(allMonths).sort();

          const monthlyTimeline = sortedMonths.map((month) => ({
            month,
            newRFIs: rfiByMonth.get(month) ?? 0,
            newSubmittals: subByMonth.get(month) ?? 0,
            newChangeOrders: coByMonth.get(month)?.count ?? 0,
            changeOrderValue: coByMonth.get(month)?.value ?? 0,
            newInsights: insightByMonth.get(month)?.total ?? 0,
            criticalInsights: insightByMonth.get(month)?.critical ?? 0,
          }));

          return {
            project: { id: resolved.id, name: resolved.name },
            periodMonths: months ?? 6,
            totals: {
              rfisCreated: rfis.length,
              submittalsCreated: submittals.length,
              changeOrdersCreated: cos.length,
              changeOrderTotalValue: cos.reduce(
                (sum, co) => sum + asNumber(co.amount),
                0,
              ),
              insightsGenerated: insights.length,
            },
            monthlyTimeline,
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 8. Forecast Comparison (Phase 1D)
    // -----------------------------------------------------------------------
    getForecastComparison: tool({
      description:
        "Compare original budget vs. revised budget vs. actual costs for a project. " +
        "Shows budget line-by-line variance, cost code analysis, and over/under budget items. " +
        "Use when asked about forecast, budget vs actual, variance analysis, " +
        "or which cost codes are over budget.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
        sortBy: z
          .enum(["variance", "amount", "code"])
          .optional()
          .default("variance")
          .describe("Sort budget lines by variance (default), amount, or code"),
      }),
      execute: withTrace(
        "getForecastComparison",
        options,
        async ({ projectId, projectName, sortBy }) => {
          const resolved = await resolveProject(
            supabase,
            projectId,
            projectName,
          );
          if ("error" in resolved) return resolved;

          // Fetch budget lines with full financial data
          const { data: budgetRows, error } = await supabase
            .from("v_budget_lines")
            .select("*")
            .eq("project_id", resolved.id);

          if (error) return { error: error.message };
          const lines = (budgetRows ?? []) as AnyRow[];

          // Compute per-line variance
          const enrichedLines = lines.map((line) => {
            const original = asNumber(line.original_amount);
            const revised = asNumber(line.revised_budget);
            const approvedCOs = asNumber(line.approved_co_total);
            const budgetMods = asNumber(line.budget_mod_total);
            const variance = revised - original;
            const variancePct =
              original > 0
                ? Math.round((variance / original) * 100)
                : 0;

            return {
              costCode: line.cost_code,
              description: line.description,
              originalBudget: original,
              revisedBudget: revised,
              approvedCOs,
              budgetModifications: budgetMods,
              variance,
              variancePct,
              isOverBudget: variance > 0,
            };
          });

          // Sort
          if (sortBy === "variance") {
            enrichedLines.sort(
              (a, b) => Math.abs(b.variance) - Math.abs(a.variance),
            );
          } else if (sortBy === "amount") {
            enrichedLines.sort((a, b) => b.revisedBudget - a.revisedBudget);
          } else {
            enrichedLines.sort((a, b) =>
              ((a.costCode as string) ?? "").localeCompare(
                (b.costCode as string) ?? "",
              ),
            );
          }

          // Portfolio totals
          const totalOriginal = enrichedLines.reduce(
            (sum, l) => sum + l.originalBudget,
            0,
          );
          const totalRevised = enrichedLines.reduce(
            (sum, l) => sum + l.revisedBudget,
            0,
          );
          const totalVariance = totalRevised - totalOriginal;
          const overBudgetItems = enrichedLines.filter((l) => l.isOverBudget);
          const underBudgetItems = enrichedLines.filter(
            (l) => l.variance < 0,
          );

          return {
            project: { id: resolved.id, name: resolved.name },
            summary: {
              totalBudgetLines: lines.length,
              totalOriginalBudget: totalOriginal,
              totalRevisedBudget: totalRevised,
              totalVariance,
              variancePct:
                totalOriginal > 0
                  ? Math.round((totalVariance / totalOriginal) * 100)
                  : 0,
              overBudgetLineCount: overBudgetItems.length,
              underBudgetLineCount: underBudgetItems.length,
            },
            topVariances: enrichedLines.slice(0, 20),
            overBudgetItems: overBudgetItems.slice(0, 10).map((l) => ({
              costCode: l.costCode,
              description: l.description,
              original: l.originalBudget,
              revised: l.revisedBudget,
              variance: l.variance,
              variancePct: l.variancePct,
            })),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------------
    // 9. Semantic Search (wraps search_all_knowledge RPC)
    // -----------------------------------------------------------------------
    semanticSearch: tool({
      description:
        "Search across ALL project knowledge using semantic similarity: " +
        "meeting transcripts, RFIs, submittals, change orders, insights, " +
        "and any other indexed content. Use when the user asks a broad " +
        "question that could span multiple data types, or when keyword " +
        "search isn't finding results.",
      inputSchema: z.object({
        query: z.string().describe("Natural language search query"),
        matchCount: z
          .number()
          .optional()
          .default(10)
          .describe("Number of results to return"),
        threshold: z
          .number()
          .optional()
          .default(0.3)
          .describe("Minimum similarity threshold (0-1)"),
      }),
      execute: withTrace(
        "semanticSearch",
        options,
        async ({ query, matchCount, threshold }) => {
          try {
            // Generate embedding
            const openai = getOpenAI();
            const embeddingResponse = await openai.embeddings.create({
              model: "text-embedding-3-small",
              input: query,
            });

            const queryEmbedding = embeddingResponse.data[0].embedding;

            // Call search RPC — pgvector expects JSON string
            const { data, error } = await supabase.rpc(
              "search_all_knowledge",
              {
                query_embedding: JSON.stringify(queryEmbedding),
                match_count: matchCount ?? 10,
                match_threshold: threshold ?? 0.3,
              },
            );

            if (error) return { error: error.message };
            const results = (data ?? []) as AnyRow[];

            if (results.length === 0) {
              return {
                results: [],
                message: `No results found for "${query}". Try rephrasing or broadening your search.`,
              };
            }

            return {
              query,
              resultCount: results.length,
              results: results.map((r) => ({
                content: (r.content as string)?.substring(0, 500),
                sourceTable: r.source_table,
                recordId: r.record_id,
                similarity: Math.round(asNumber(r.similarity) * 100) / 100,
                projectIds: r.project_ids,
                metadata: r.metadata,
              })),
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            return {
              error: `Semantic search failed: ${msg}`,
              fallback:
                "Try using searchDocuments for keyword-based search instead.",
            };
          }
        },
      ),
    }),

    // -----------------------------------------------------------------
    // Company Knowledge
    // -----------------------------------------------------------------

    getCompanyKnowledge: tool({
      description:
        "Retrieve company-level context: mission, vision, goals, strategy, " +
        "OKRs, org structure, competitive landscape, policies, key clients, " +
        "certifications, and free-form knowledge articles. " +
        "Use this when the user asks about the company itself, its strategy, " +
        "values, differentiators, history, or competitive positioning. " +
        "Also use this to retrieve policy info or best practices.",
      inputSchema: z.object({
        category: z
          .enum([
            "all",
            "profile",
            "strategy",
            "policy",
            "process",
            "market_intel",
            "lessons_learned",
            "best_practice",
            "org_update",
            "general",
          ])
          .optional()
          .default("all")
          .describe(
            "Filter knowledge articles by category. 'profile' returns " +
              "company_context data. 'all' returns profile + all articles.",
          ),
        searchQuery: z
          .string()
          .optional()
          .describe(
            "Optional text to search within knowledge article titles/content.",
          ),
      }),
      execute: withTrace(
        "getCompanyKnowledge",
        options,
        async ({ category, searchQuery }) => {
          try {
            // Always fetch the company_context profile row
            const { data: ctxRows } = await supabase
              .from("company_context")
              .select("*")
              .limit(1);

            const ctx = ctxRows?.[0] as AnyRow | undefined;

            const profile = ctx
              ? {
                  mission: ctx.mission,
                  vision: ctx.vision,
                  companyHistory: ctx.company_history,
                  coreValues: ctx.core_values,
                  keyDifferentiators: ctx.key_differentiators,
                  competitiveLandscape: ctx.competitive_landscape,
                  targetMarkets: ctx.target_markets,
                  goals: ctx.goals,
                  okrs: ctx.okrs,
                  strategicInitiatives: ctx.strategic_initiatives,
                  orgStructure: ctx.org_structure,
                  policies: ctx.policies,
                  resourceConstraints: ctx.resource_constraints,
                  annualRevenueRange: ctx.annual_revenue_range,
                  employeeCount: ctx.employee_count,
                  foundedYear: ctx.founded_year,
                  headquarters: ctx.headquarters,
                  serviceAreas: ctx.service_areas,
                  certifications: ctx.certifications,
                  keyClients: ctx.key_clients,
                  notes: ctx.notes,
                }
              : null;

            // If just profile requested
            if (category === "profile") {
              return {
                profile,
                articles: [],
                message: profile
                  ? "Company profile loaded."
                  : "No company profile found. Ask the admin to set up company context.",
              };
            }

            // Fetch knowledge articles
            let query = supabase
              .from("company_knowledge")
              .select("*")
              .eq("is_active", true)
              .order("updated_at", { ascending: false })
              .limit(20);

            if (category !== "all") {
              query = query.eq("category", category);
            }

            if (searchQuery) {
              query = query.or(
                `title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`,
              );
            }

            const { data: articles } = await query;

            const articleList = ((articles ?? []) as unknown as AnyRow[]).map(
              (a) => ({
                id: a.id,
                category: a.category,
                title: a.title,
                content: (a.content as string)?.substring(0, 800),
                tags: a.tags,
                source: a.source,
                updatedAt: a.updated_at,
              }),
            );

            const hasProfile = profile !== null;
            const isEmpty = !hasProfile && articleList.length === 0;

            return {
              profile: category === "all" ? profile : undefined,
              articles: articleList,
              articleCount: articleList.length,
              message: isEmpty
                ? "No company knowledge found. The admin should add company profile data and knowledge articles."
                : `Found company profile${hasProfile ? " ✓" : " (empty)"} and ${articleList.length} knowledge article(s).`,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            return { error: `Company knowledge lookup failed: ${msg}` };
          }
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 11. Conversation Memory Recall
    // -----------------------------------------------------------------

    recallPastConversations: tool({
      description:
        "Search past conversation memories to recall prior discussions " +
        "with this user. Use when the user references previous conversations " +
        '("like we talked about", "remember when", "last time"), or when ' +
        "context from prior sessions would improve the response (recurring " +
        "topics, established preferences, prior decisions).",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "What to search for in past conversations — e.g. 'cash flow discussion' or 'Cedar Park budget concerns'",
          ),
        matchCount: z
          .number()
          .optional()
          .default(5)
          .describe("Number of past conversations to return"),
      }),
      execute: withTrace(
        "recallPastConversations",
        options,
        async ({ query, matchCount }) => {
          try {
            const openaiClient = getOpenAI();
            const embeddingResponse = await openaiClient.embeddings.create({
              model: "text-embedding-3-small",
              input: query,
            });

            const queryEmbedding = embeddingResponse.data[0].embedding;

            const { data, error } = await supabase.rpc(
              "search_conversation_memories",
              {
                query_embedding: JSON.stringify(queryEmbedding),
                match_count: matchCount ?? 5,
                filter_user_id: _userId,
              },
            );

            if (error) return { error: error.message };
            const results = (data ?? []) as Array<{
              id: number;
              content: string;
              metadata: Record<string, unknown>;
              similarity: number;
            }>;

            if (results.length === 0) {
              return {
                results: [],
                message:
                  "No past conversation memories found. This may be a new user or their conversations haven't been indexed yet.",
              };
            }

            return {
              query,
              resultCount: results.length,
              results: results.map((r) => ({
                summary: r.content,
                similarity:
                  Math.round((r.similarity as number) * 100) / 100,
                sessionId: (r.metadata as Record<string, unknown>)
                  ?.session_id,
                date:
                  (r.metadata as Record<string, unknown>)?.created_at ??
                  (r.metadata as Record<string, unknown>)?.updated_at,
              })),
            };
          } catch (err) {
            const msg =
              err instanceof Error ? err.message : "Unknown error";
            return {
              error: `Conversation memory recall failed: ${msg}`,
              fallback:
                "Unable to search past conversations. Proceed without historical context.",
            };
          }
        },
      ),
    }),
  };
}
