import { tool } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import OpenAI from "openai";
import {
  searchMemories as searchAiMemories,
  writeMemory as writeAiMemory,
  type MemoryType,
  type MemoryVisibility,
} from "@/lib/ai/services/ai-memory-service";

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
  userId: string,
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

          // Fetch subcontracts for commitment data first so we know which companies to look up
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

          // Collect unique company UUIDs from subcontracts
          // contract_company_id is a UUID referencing companies.id (not vendors.id)
          const companyIds = Array.from(
            new Set(subs.map((s) => s.contract_company_id as string).filter(Boolean)),
          );

          // Fetch companies by UUID — parallel with SOV fetch
          const subIds = subs.map((s) => s.id as string).filter(Boolean);
          const [companiesRes, sovRes] = await Promise.all([
            companyIds.length > 0
              ? supabase
                  .from("companies")
                  .select("id, name")
                  .in("id", companyIds)
                  .then((r) => r)
              : Promise.resolve({ data: [] }),
            subIds.length > 0
              ? supabase
                  .from("schedule_of_values")
                  .select("id, commitment_id, total_amount, status")
                  .in("commitment_id", subIds)
              : Promise.resolve({ data: [] }),
          ]);

          // Optionally filter by vendor name
          let companies = (companiesRes.data ?? []) as AnyRow[];
          if (vendorName) {
            const lower = vendorName.toLowerCase();
            companies = companies.filter((c) =>
              String(c.name ?? "").toLowerCase().includes(lower),
            );
          }

          const sovData = (sovRes.data ?? []) as AnyRow[];

          // Index SOVs by commitment_id
          const sovByCommitment = new Map<string, AnyRow>();
          sovData.forEach((s) => {
            if (s.commitment_id) sovByCommitment.set(s.commitment_id as string, s);
          });

          // Build company lookup map (UUID → company row)
          const companyMap = new Map<string, AnyRow>();
          companies.forEach((c) => companyMap.set(c.id as string, c));

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
              vendor: companyMap.get(companyId) ?? {
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
              companyName: v.vendor.name,
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
        "meeting transcripts, chunked document content, RFIs, submittals, " +
        "change orders, insights, company knowledge base entries (lessons learned, " +
        "pricing intel, system design notes, vendor intel), and other indexed content. " +
        "Uses blended retrieval from unified knowledge + document chunks + knowledge base. " +
        "Works CROSS-PROJECT by default — no project filter needed. " +
        "Optionally filter by project name or ID. Use when " +
        "the user asks a broad question that could span multiple data types, " +
        "or when keyword search isn't finding results.",
      inputSchema: z.object({
        query: z.string().describe("Natural language search query"),
        projectId: z
          .number()
          .optional()
          .describe(
            "Optional project ID filter. When provided, non-matching document chunks are excluded.",
          ),
        projectName: z
          .string()
          .optional()
          .describe("Optional project name to resolve to ID (e.g. 'Uniqlo', 'Cedar Park')"),
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
        async ({ query, projectId, projectName, matchCount, threshold }) => {
          // Resolve project name to ID if provided
          let resolvedProjectId = projectId;
          if (!resolvedProjectId && projectName) {
            const resolved = await resolveProject(supabase, undefined, projectName);
            if (!("error" in resolved)) {
              resolvedProjectId = resolved.id;
            }
            // If project name doesn't resolve, still search across all projects
          }
          try {
            // Generate embeddings:
            // - 1536-dim for meeting/knowledge tables (search_all_knowledge, match_documents_full, search_knowledge_base)
            // - 3072-dim for document_chunks table (email, Teams, OneDrive via microsoft_graph)
            const openai = getOpenAI();
            const [embResp1536, embResp3072] = await Promise.all([
              openai.embeddings.create({ model: "text-embedding-3-large", dimensions: 1536, input: query }),
              openai.embeddings.create({ model: "text-embedding-3-large", dimensions: 3072, input: query }),
            ]);

            const embeddingArg = JSON.stringify(embResp1536.data[0].embedding);
            const embeddingArg3072 = JSON.stringify(embResp3072.data[0].embedding);
            const targetCount = matchCount ?? 10;
            const targetThreshold = threshold ?? 0.3;

            // Blended retrieval — dimension routing:
            // halfvec(3072): search_all_knowledge (decisions/risks/opportunities/meeting_segments) + search_document_chunks_by_category (email/Teams/OneDrive)
            // vector(1536):  match_documents_full (Fireflies documents) + search_knowledge_base (company_knowledge)
            const [knowledgeRes, documentRes, knowledgeBaseRes, chunksRes] = await Promise.all([
              supabase.rpc("search_all_knowledge", {
                query_embedding: embeddingArg3072, // halfvec(3072) — decisions, risks, opportunities, meeting_segments
                match_count: targetCount,
                match_threshold: targetThreshold,
              }),
              supabase.rpc("match_documents_full", {
                query_embedding: embeddingArg, // vector(1536) — documents table (legacy Fireflies)
                match_count: Math.max(targetCount * 2, 20),
                match_threshold: targetThreshold,
              }),
              supabase.rpc("search_knowledge_base", {
                query_embedding: embeddingArg, // vector(1536) — company_knowledge
                match_count: targetCount,
                match_threshold: targetThreshold,
                ...(resolvedProjectId ? { filter_project_id: resolvedProjectId } : {}),
              }),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (supabase as any).rpc("search_document_chunks_by_category", {
                query_embedding: embeddingArg3072, // halfvec(3072) — email, Teams, OneDrive
                filter_category: null,
                match_count: targetCount,
                match_threshold: targetThreshold,
              }),
            ]);

            const knowledgeError = knowledgeRes.error;
            const documentError = documentRes.error;
            if (knowledgeError && documentError) {
              return {
                error: `Semantic search failed: knowledge=${knowledgeError.message}; documents=${documentError.message}`,
              };
            }

            const rawKnowledgeRows = (knowledgeRes.data ?? []) as AnyRow[];
            const knowledgeRows = rawKnowledgeRows.filter((row) => {
              if (!resolvedProjectId) return true;
              const projectIds = Array.isArray(row.project_ids)
                ? (row.project_ids as unknown[]).filter(
                    (v): v is number => typeof v === "number",
                  )
                : [];
              return projectIds.includes(resolvedProjectId);
            });
            const rawDocumentRows = (documentRes.data ?? []) as AnyRow[];
            const documentRows = rawDocumentRows.filter((row) => {
              if (!resolvedProjectId) return true;
              const primaryProjectId =
                typeof row.project_id === "number" ? row.project_id : null;
              const projectIds = Array.isArray(row.project_ids)
                ? (row.project_ids as unknown[]).filter(
                    (v): v is number => typeof v === "number",
                  )
                : [];
              return primaryProjectId === resolvedProjectId || projectIds.includes(resolvedProjectId);
            });
            // Email / Teams / OneDrive chunks from document_chunks table
            const rawChunkRows = ((chunksRes as { data?: unknown[] }).data ?? []) as AnyRow[];
            const chunkRows = rawChunkRows.filter((row) => {
              if (!resolvedProjectId) return true;
              return typeof row.doc_project_id === "number"
                ? row.doc_project_id === resolvedProjectId
                : true;
            });

            const merged: Array<{
              key: string;
              sourceTable: string;
              recordId: string;
              content: string;
              similarity: number;
              projectIds: number[];
              metadata: AnyRow | null;
              createdAt: string | null;
            }> = [];

            for (const row of knowledgeRows) {
              const similarity = Math.round(asNumber(row.similarity) * 1000) / 1000;
              const sourceTable = String(row.source_table ?? "knowledge");
              const recordId = String(row.record_id ?? "");
              merged.push({
                key: `${sourceTable}:${recordId}`,
                sourceTable,
                recordId,
                content: String(row.content ?? ""),
                similarity,
                projectIds: Array.isArray(row.project_ids)
                  ? (row.project_ids as unknown[]).filter(
                      (v): v is number => typeof v === "number",
                    )
                  : [],
                metadata:
                  row.metadata && typeof row.metadata === "object"
                    ? (row.metadata as AnyRow)
                    : null,
                createdAt:
                  typeof row.created_at === "string" ? row.created_at : null,
              });
            }

            for (const row of documentRows) {
              const docId = String(row.id ?? row.file_id ?? "");
              const similarity = Math.round(asNumber(row.similarity) * 1000) / 1000;
              const metadata =
                row.metadata && typeof row.metadata === "object"
                  ? (row.metadata as AnyRow)
                  : null;
              merged.push({
                key: `documents:${docId}`,
                sourceTable: "documents",
                recordId: docId,
                content: String(row.content ?? ""),
                similarity,
                projectIds: Array.isArray(row.project_ids)
                  ? (row.project_ids as unknown[]).filter(
                      (v): v is number => typeof v === "number",
                    )
                  : typeof row.project_id === "number"
                    ? [row.project_id]
                    : [],
                metadata: {
                  ...(metadata ?? {}),
                  title: row.title ?? metadata?.title ?? null,
                  source: row.source ?? metadata?.source ?? null,
                  file_id: row.file_id ?? metadata?.file_id ?? null,
                  file_date: row.file_date ?? metadata?.file_date ?? null,
                },
                createdAt:
                  typeof row.created_at === "string" ? row.created_at : null,
              });
            }

            // 3) Knowledge base entries (company_knowledge with embeddings)
            const rawKBRows = (knowledgeBaseRes.data ?? []) as AnyRow[];
            for (const row of rawKBRows) {
              const similarity = Math.round(asNumber(row.similarity) * 1000) / 1000;
              const kbId = String(row.id ?? "");
              merged.push({
                key: `knowledge_base:${kbId}`,
                sourceTable: "knowledge_base",
                recordId: kbId,
                content: `[${String(row.category ?? "general")}] ${String(row.title ?? "")}: ${String(row.content ?? "")}`,
                similarity,
                projectIds: typeof row.project_id === "number" ? [row.project_id] : [],
                metadata: {
                  title: row.title,
                  category: row.category,
                  tags: row.tags,
                  source: row.source,
                  origin: row.origin,
                },
                createdAt:
                  typeof row.created_at === "string" ? row.created_at : null,
              });
            }

            // 4) External document chunks (email, Teams, OneDrive via Microsoft Graph)
            for (const row of chunkRows) {
              const similarity = Math.round(asNumber(row.similarity) * 1000) / 1000;
              const category = String(row.doc_category ?? "document");
              const sourceLabel =
                category === "email" ? "email" :
                category === "teams_message" ? "Teams" :
                "document";
              merged.push({
                key: `doc_chunk:${String(row.chunk_id ?? row.document_id ?? "")}`,
                sourceTable: `external_${sourceLabel}`,
                recordId: String(row.document_id ?? ""),
                content: String(row.chunk_text ?? ""),
                similarity,
                projectIds: typeof row.doc_project_id === "number" ? [row.doc_project_id] : [],
                metadata: {
                  title: row.doc_title,
                  category: row.doc_category,
                  source: row.doc_source,
                  type: row.doc_type,
                  date: row.doc_date,
                  participants: row.doc_participants,
                },
                createdAt:
                  typeof row.doc_date === "string" ? row.doc_date :
                  typeof row.doc_created_at === "string" ? row.doc_created_at : null,
              });
            }

            const dedupedMap = new Map<string, (typeof merged)[number]>();
            for (const item of merged) {
              const existing = dedupedMap.get(item.key);
              if (!existing || item.similarity > existing.similarity) {
                dedupedMap.set(item.key, item);
              }
            }
            // Time-decay: blend semantic similarity (90%) with recency (10%).
            // Recency decays exponentially: full weight today, ~50% at 6 months, floor 0.1 at 2+ years.
            const nowMs = Date.now();
            const recencyScore = (createdAt: string | null): number => {
              if (!createdAt) return 0.5;
              const ageMs = nowMs - new Date(createdAt).getTime();
              const ageDays = ageMs / (1000 * 60 * 60 * 24);
              return Math.max(0.1, Math.exp(-ageDays / 180));
            };

            const results = (Array.from(dedupedMap.values()) as (typeof merged)[number][])
              .map((item) => ({
                ...item,
                finalScore: item.similarity * 0.9 + recencyScore(item.createdAt) * 0.1,
              }))
              .sort((a, b) => b.finalScore - a.finalScore)
              .slice(0, targetCount);

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
                content: r.content.substring(0, 2500),
                sourceTable: r.sourceTable,
                recordId: r.recordId,
                similarity: r.similarity,
                finalScore: Math.round(r.finalScore * 1000) / 1000,
                projectIds: r.projectIds,
                metadata: r.metadata,
                createdAt: r.createdAt,
              })),
              retrievalBreakdown: {
                knowledgeMatches: knowledgeRows.length,
                documentChunkMatches: documentRows.length,
                externalChunkMatches: chunkRows.length,
                usedProjectFilter: Boolean(resolvedProjectId),
              },
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
                filter_user_id: userId,
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

    // -----------------------------------------------------------------
    // 12. Search Meetings By Topic (cross-project, enriched results)
    // -----------------------------------------------------------------

    searchMeetingsByTopic: tool({
      description:
        "Search for meetings about a specific topic across ALL projects. " +
        "Returns enriched results with speaker quotes, decisions, risks, " +
        "and action items from meeting digests and segments. " +
        "Use this when the user asks 'find meetings about X' or " +
        "'what have we discussed about Y'. Works cross-project by default. " +
        "Combines keyword search AND semantic search for best coverage.",
      inputSchema: z.object({
        topic: z
          .string()
          .describe("The topic to search for (e.g. 'ASRS', 'sprinkler design', 'pricing')"),
        projectId: z
          .number()
          .optional()
          .describe("Optional project ID to filter by"),
        projectName: z
          .string()
          .optional()
          .describe("Optional project name to filter by (e.g. 'Uniqlo')"),
        maxResults: z
          .number()
          .optional()
          .default(10)
          .describe("Max meetings to return"),
      }),
      execute: withTrace(
        "searchMeetingsByTopic",
        options,
        async ({ topic, projectId, projectName, maxResults }) => {
          // Resolve project name
          let resolvedProjectId = projectId;
          if (!resolvedProjectId && projectName) {
            const resolved = await resolveProject(supabase, undefined, projectName);
            if (!("error" in resolved)) {
              resolvedProjectId = resolved.id;
            }
          }

          const targetCount = maxResults ?? 10;

          // Strategy: run keyword search + semantic search in parallel
          const [keywordRes, semanticRes] = await Promise.all([
            // 1. Full-text search
            supabase.rpc("full_text_search_meetings", {
              search_query: topic,
              match_count: targetCount,
            }),
            // 2. Semantic search via embeddings
            (async () => {
              try {
                const openai = getOpenAI();
                const embResp = await openai.embeddings.create({
                  model: "text-embedding-3-small",
                  input: topic,
                });
                const emb = JSON.stringify(embResp.data[0].embedding);
                return supabase.rpc("match_documents_full", {
                  query_embedding: emb,
                  match_count: targetCount * 2,
                  match_threshold: 0.3,
                });
              } catch {
                return { data: [], error: null };
              }
            })(),
          ]);

          // Collect unique meeting IDs from both searches
          const meetingIds = new Set<string>();
          const keywordMeetings = (keywordRes.data ?? []) as AnyRow[];
          for (const m of keywordMeetings) {
            if (m.id) meetingIds.add(String(m.id));
          }
          const semanticDocs = (semanticRes.data ?? []) as AnyRow[];
          for (const d of semanticDocs) {
            const fileId = d.file_id ?? (d.metadata as AnyRow)?.file_id;
            if (fileId) meetingIds.add(String(fileId));
          }

          if (meetingIds.size === 0) {
            return {
              results: [],
              message: `No meetings found discussing "${topic}". Try broader terms.`,
            };
          }

          // Fetch full meeting metadata + digests + segments for matched meetings
          const ids = Array.from(meetingIds).slice(0, targetCount);
          let meetingQuery = supabase
            .from("document_metadata")
            .select("id, title, date, project, project_id, summary, overview, participants, action_items")
            .in("id", ids)
            .order("date", { ascending: false });
          if (resolvedProjectId) {
            meetingQuery = meetingQuery.eq("project_id", resolvedProjectId);
          }

          const [meetingsRes, digestsRes, segmentsRes] = await Promise.all([
            meetingQuery,
            supabase
              .from("meeting_digests")
              .select("metadata_id, key_takeaways, decisions_summary, risks_summary, action_items_summary")
              .in("metadata_id", ids),
            supabase
              .from("meeting_segments")
              .select("metadata_id, title, summary, decisions, risks, tasks, segment_index")
              .in("metadata_id", ids)
              .order("segment_index", { ascending: true }),
          ]);

          const meetings = (meetingsRes.data ?? []) as AnyRow[];
          const digests = (digestsRes.data ?? []) as AnyRow[];
          const segments = (segmentsRes.data ?? []) as AnyRow[];

          // Index digests and segments by meeting ID
          const digestMap = new Map<string, AnyRow>();
          for (const d of digests) {
            digestMap.set(String(d.metadata_id), d);
          }
          const segmentMap = new Map<string, AnyRow[]>();
          for (const s of segments) {
            const key = String(s.metadata_id);
            const existing = segmentMap.get(key) ?? [];
            existing.push(s);
            segmentMap.set(key, existing);
          }

          return {
            searchScope: resolvedProjectId ? `Filtered to project ${resolvedProjectId}` : "All projects",
            topic,
            totalResults: meetings.length,
            results: meetings.map((m) => {
              const mId = String(m.id);
              const digest = digestMap.get(mId);
              const segs = segmentMap.get(mId) ?? [];
              // Find segments most relevant to the topic
              const topicLower = topic.toLowerCase();
              const relevantSegs = segs.filter((s) => {
                const text = `${s.title ?? ""} ${s.summary ?? ""}`.toLowerCase();
                return topicLower.split(/\s+/).some((word) => text.includes(word));
              }).slice(0, 3);

              return {
                sourceRef: `[Source: Meeting - "${m.title}" - ${m.date}]`,
                id: m.id,
                title: m.title,
                date: m.date,
                project: m.project,
                projectId: m.project_id,
                participants: m.participants,
                summary: String(m.summary || m.overview || "").substring(0, 800),
                actionItems: m.action_items,
                digest: digest
                  ? {
                      keyTakeaways: digest.key_takeaways,
                      decisions: digest.decisions_summary,
                      risks: digest.risks_summary,
                      actionItems: digest.action_items_summary,
                    }
                  : null,
                relevantSegments: relevantSegs.map((s) => ({
                  topic: s.title,
                  summary: String(s.summary ?? "").substring(0, 500),
                  decisions: s.decisions,
                  risks: s.risks,
                  tasks: s.tasks,
                })),
              };
            }),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 13. Get Meeting Details (full meeting with digest + segments + quotes)
    // -----------------------------------------------------------------

    getMeetingDetails: tool({
      description:
        "Get the FULL details of a specific meeting including its digest, " +
        "segments with speaker discussion topics, decisions, risks, and " +
        "action items. Provide EITHER meetingId (exact DB id from a prior search) " +
        "OR meetingTitle (the meeting name — will be looked up automatically). " +
        "NEVER guess or construct a meetingId from a date or title string. " +
        "If you only know the title, pass meetingTitle and the ID will be resolved.",
      inputSchema: z.object({
        meetingId: z
          .string()
          .optional()
          .describe(
            "The exact meeting ID from document_metadata.id — only use this if you got it from a prior searchMeetingsByTopic or getMeetingsByDate call",
          ),
        meetingTitle: z
          .string()
          .optional()
          .describe(
            "The meeting title to search for — use this when you know the name but not the ID",
          ),
      }),
      execute: withTrace(
        "getMeetingDetails",
        options,
        async ({ meetingId, meetingTitle }) => {
          // Resolve ID from title if no meetingId provided (or if meetingId lookup fails)
          let resolvedId = meetingId;

          if (!resolvedId && meetingTitle) {
            // Search by title — ilike for case-insensitive partial match
            const { data: found } = await supabase
              .from("document_metadata")
              .select("id, title")
              .or("type.eq.meeting,category.eq.meeting,type.eq.meeting_transcript")
              .ilike("title", `%${meetingTitle}%`)
              .order("date", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (!found) {
              return {
                error: `No meeting found with title matching "${meetingTitle}". Try searchMeetingsByTopic with keywords from the title.`,
              };
            }
            resolvedId = found.id as string;
          }

          if (!resolvedId) {
            return { error: "Provide either meetingId or meetingTitle" };
          }

          const [meetingRes, digestRes, segmentsRes, insightsRes] =
            await Promise.all([
              supabase
                .from("document_metadata")
                .select("*")
                .eq("id", resolvedId)
                .single(),
              supabase
                .from("meeting_digests")
                .select("*")
                .eq("metadata_id", resolvedId)
                .maybeSingle(),
              supabase
                .from("meeting_segments")
                .select("*")
                .eq("metadata_id", resolvedId)
                .order("segment_index", { ascending: true }),
              supabase
                .from("ai_insights")
                .select("title, description, insight_type, severity, exact_quotes_text, stakeholders_affected")
                .eq("meeting_id", resolvedId),
            ]);

          // If direct ID lookup failed and we have a title, the ID may have been guessed
          if (meetingRes.error || !meetingRes.data) {
            if (meetingTitle) {
              return { error: `Meeting with title "${meetingTitle}" could not be retrieved. Try searchMeetingsByTopic first.` };
            }
            return { error: `Meeting ID "${resolvedId}" not found. IMPORTANT: Do not guess meeting IDs — use searchMeetingsByTopic or getMeetingsByDate to get the real ID first, then call getMeetingDetails with that exact ID.` };
          }

          const m = meetingRes.data as AnyRow;
          const digest = digestRes.data as AnyRow | null;
          const segments = (segmentsRes.data ?? []) as AnyRow[];
          const insights = (insightsRes.data ?? []) as AnyRow[];

          return {
            sourceRef: `[Source: Meeting - "${m.title}" - ${m.date}]`,
            meeting: {
              id: m.id,
              title: m.title,
              date: m.date,
              project: m.project,
              projectId: m.project_id,
              participants: m.participants,
              participantsArray: m.participants_array,
              duration: m.duration_minutes,
              summary: m.summary,
              overview: m.overview,
              actionItems: m.action_items,
              bulletPoints: m.bullet_points,
            },
            digest: digest
              ? {
                  digestText: (digest.digest_text as string)?.substring(0, 2000),
                  keyTakeaways: digest.key_takeaways,
                  decisions: digest.decisions_summary,
                  risks: digest.risks_summary,
                  actionItems: digest.action_items_summary,
                  opportunities: digest.opportunities_summary,
                  followUps: digest.follow_ups,
                }
              : null,
            segments: segments.map((s) => ({
              index: s.segment_index,
              topic: s.title,
              summary: String(s.summary ?? "").substring(0, 600),
              decisions: s.decisions,
              risks: s.risks,
              tasks: s.tasks,
            })),
            insights: insights.map((i) => ({
              title: i.title,
              description: i.description,
              type: i.insight_type,
              severity: i.severity,
              quotes: i.exact_quotes_text,
              stakeholders: i.stakeholders_affected,
            })),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 14. Save to Knowledge Base (write tool)
    // -----------------------------------------------------------------

    saveToKnowledgeBase: tool({
      description:
        "Save knowledge, lessons learned, best practices, or institutional " +
        "memory to the company knowledge base. Use this when the user says " +
        "'save this', 'remember this', 'I want to capture this', or " +
        "'add this to the knowledge base'. The saved knowledge becomes " +
        "searchable and available to all users via the AI assistant. " +
        "Categories: lessons_learned, best_practice, process, policy, " +
        "market_intel, general, strategy, org_update.",
      inputSchema: z.object({
        title: z
          .string()
          .describe("Clear, descriptive title for the knowledge entry"),
        content: z
          .string()
          .describe("The knowledge content — be thorough and include context, rationale, and specifics"),
        category: z
          .enum([
            "lessons_learned",
            "best_practice",
            "process",
            "policy",
            "market_intel",
            "general",
            "strategy",
            "org_update",
          ])
          .describe("Category for the knowledge entry"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Tags for searchability (e.g. ['ASRS', 'fire suppression', 'pricing'])"),
        source: z
          .string()
          .optional()
          .describe("Source of the knowledge (e.g. 'Meeting: Sprinkler Pricing Review 2026-03-13', 'Brandon Clymer')"),
      }),
      execute: withTrace(
        "saveToKnowledgeBase",
        options,
        async ({ title, content, category, tags, source }) => {
          try {
            const { data, error } = await supabase
              .from("company_knowledge")
              .insert({
                title,
                content,
                category,
                tags: tags ?? [],
                source: source ?? "AI Assistant",
                author_id: userId,
                is_active: true,
              })
              .select("id, title, category, tags")
              .single();

            if (error) return { error: `Failed to save knowledge: ${error.message}` };

            return {
              success: true,
              savedEntry: data,
              message: `Knowledge saved: "${title}" (${category}). This is now searchable by all users via the AI assistant.`,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            return { error: `Failed to save knowledge: ${msg}` };
          }
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 15. Save Insight from Meeting/Conversation (write tool)
    // -----------------------------------------------------------------

    saveInsight: tool({
      description:
        "Save a structured insight extracted from meetings or conversations. " +
        "Use when the user highlights something important from a meeting " +
        "or discussion that should be tracked — risks, decisions, cost " +
        "impacts, design considerations, etc. Links to the source meeting " +
        "when available.",
      inputSchema: z.object({
        title: z.string().describe("Concise insight title"),
        description: z
          .string()
          .describe("Detailed description of the insight"),
        insightType: z
          .enum(["risk", "decision", "opportunity", "cost_impact", "design_consideration", "lesson_learned", "action_required"])
          .describe("Type of insight"),
        severity: z
          .enum(["low", "medium", "high", "critical"])
          .optional()
          .default("medium")
          .describe("Severity/importance level"),
        projectId: z.number().optional().describe("Project ID if applicable"),
        projectName: z.string().optional().describe("Project name if known"),
        meetingId: z.string().optional().describe("Source meeting ID if applicable"),
        meetingName: z.string().optional().describe("Source meeting name"),
        meetingDate: z.string().optional().describe("Source meeting date"),
        quotes: z.string().optional().describe("Relevant quotes from the discussion"),
        stakeholders: z
          .array(z.string())
          .optional()
          .describe("People involved or affected"),
        financialImpact: z.number().optional().describe("Estimated financial impact in dollars"),
      }),
      execute: withTrace(
        "saveInsight",
        options,
        async ({
          title,
          description,
          insightType,
          severity,
          projectId,
          projectName,
          meetingId,
          meetingName,
          meetingDate,
          quotes,
          stakeholders,
          financialImpact,
        }) => {
          try {
            // Resolve project if name provided
            let resolvedProjectId = projectId;
            let resolvedProjectName = projectName;
            if (!resolvedProjectId && projectName) {
              const resolved = await resolveProject(supabase, undefined, projectName);
              if (!("error" in resolved)) {
                resolvedProjectId = resolved.id;
                resolvedProjectName = resolved.name;
              }
            }

            const { data, error } = await supabase
              .from("ai_insights")
              .insert({
                title,
                description,
                insight_type: insightType,
                severity: severity ?? "medium",
                project_id: resolvedProjectId ?? null,
                project_name: resolvedProjectName ?? null,
                meeting_id: meetingId ?? null,
                meeting_name: meetingName ?? null,
                meeting_date: meetingDate ?? null,
                exact_quotes_text: quotes ?? null,
                stakeholders_affected: stakeholders ?? [],
                financial_impact: financialImpact ?? null,
                status: "active",
              })
              .select("id, title, insight_type, severity, project_name")
              .single();

            if (error) return { error: `Failed to save insight: ${error.message}` };

            return {
              success: true,
              savedInsight: data,
              message: `Insight saved: "${title}" (${insightType}, ${severity}). ${resolvedProjectName ? `Linked to project: ${resolvedProjectName}.` : ""} This is now visible in project dashboards and AI analysis.`,
            };
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            return { error: `Failed to save insight: ${msg}` };
          }
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 16. Resolve Project (utility — find project by name)
    // -----------------------------------------------------------------

    // -----------------------------------------------------------------
    // 17. Search Memories (semantic search over user's memory store)
    // -----------------------------------------------------------------

    searchMemories: tool({
      description:
        "Search your memory of this user — their preferences, facts about projects, " +
        "lessons learned, open commitments, and recent context from past sessions. " +
        "Use this when the user references something from a previous conversation, " +
        "or when you want to personalize a response based on what you know about them. " +
        "Memory types: fact (project/people facts), preference (how they like info), " +
        "lesson (patterns you've observed), commitment (tracked commitments), " +
        "context (situational context from recent sessions).",
      inputSchema: z.object({
        query: z
          .string()
          .describe("What you're looking for in memory (natural language)"),
        type: z
          .enum(["fact", "preference", "lesson", "commitment", "context"])
          .optional()
          .describe("Filter to a specific memory type"),
        projectId: z
          .number()
          .optional()
          .describe("Filter to memories linked to a specific project"),
      }),
      execute: withTrace(
        "searchMemories",
        options,
        async ({ query, type, projectId }) => {
          const results = await searchAiMemories({
            userId,
            query,
            type: type as MemoryType | undefined,
            projectId,
            matchCount: 8,
            matchThreshold: 0.4,
          });

          if (results.length === 0) {
            return { memories: [], message: "No relevant memories found." };
          }

          return {
            memories: results.map((m) => ({
              type: m.type,
              content: m.content,
              confidence: m.confidence,
              importance: m.importance,
              projectId: m.project_id,
              source: m.source,
              createdAt: m.created_at,
              similarity: m.similarity,
            })),
          };
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 18. Write Memory (store something worth remembering)
    // -----------------------------------------------------------------

    writeMemory: tool({
      description:
        "Store a durable memory about this user for future sessions. " +
        "Use this when you learn something worth remembering: a preference, " +
        "a fact about their projects or team, a pattern you've noticed, " +
        "a commitment that needs tracking, or important context. " +
        "Do NOT use this for transient operational data — only things that " +
        "improve future conversations. Memory types: " +
        "fact (objective facts), preference (how they like things), " +
        "lesson (patterns/insights), commitment (tracked commitment with owner + deadline), " +
        "context (situational context, expires in 30 days).",
      inputSchema: z.object({
        type: z
          .enum(["fact", "preference", "lesson", "commitment", "context"])
          .describe("Type of memory to store"),
        content: z
          .string()
          .describe(
            "The memory content — 1-2 sentences, specific. " +
            "Include names, numbers, dates when relevant. " +
            "Example: 'User prefers bullet-point financial summaries over prose paragraphs' " +
            "or 'Brandon Clymer committed to ROM estimates for Vermillion Rise by March 15, 2026'",
          ),
        projectId: z
          .number()
          .optional()
          .describe("Project ID if this memory is project-specific"),
        importance: z
          .number()
          .min(0.1)
          .max(1.0)
          .optional()
          .describe(
            "How important is this to surface in future sessions? " +
            "0.1 = minor detail, 0.5 = useful context, 1.0 = critical to remember",
          ),
        confidence: z
          .number()
          .min(0.1)
          .max(1.0)
          .optional()
          .describe("How confident are you this is accurate? Default 0.9"),
        visibility: z
          .enum(["private", "team"])
          .optional()
          .describe(
            "Who should see this memory? " +
            "private = only this user (default for preferences/context), " +
            "team = all users (use for facts/lessons about projects that benefit everyone)",
          ),
      }),
      execute: withTrace(
        "writeMemory",
        options,
        async ({ type, content, projectId, importance, confidence, visibility }) => {
          const result = await writeAiMemory({
            userId,
            type: type as MemoryType,
            content,
            projectId,
            importance,
            confidence,
            visibility: visibility as MemoryVisibility | undefined,
            source: "conversation",
          });

          if ("error" in result) {
            return { success: false, error: result.error };
          }

          return {
            success: true,
            id: result.id,
            message: `Memory stored: [${type}] "${content.substring(0, 80)}${content.length > 80 ? "..." : ""}"`,
          };
        },
      ),
    }),

    findProject: tool({
      description:
        "Look up a project by name (partial match) or list all active projects. " +
        "Use this when the user mentions a project by name and you need to " +
        "resolve it to an ID, or when you're unsure which project they mean. " +
        "Returns project ID, name, phase, and key stats.",
      inputSchema: z.object({
        projectName: z
          .string()
          .optional()
          .describe("Project name or partial name to search for"),
        listAll: z
          .boolean()
          .optional()
          .default(false)
          .describe("If true, list all active (non-archived) projects"),
      }),
      execute: withTrace(
        "findProject",
        options,
        async ({ projectName, listAll }) => {
          if (listAll) {
            const { data, error } = await supabase
              .from("projects")
              .select("id, name, phase")
              .eq("archived", false)
              .order("name", { ascending: true })
              .limit(50);
            if (error) return { error: error.message };
            return {
              projects: ((data ?? []) as unknown as AnyRow[]).map((p) => ({
                id: p.id,
                name: p.name,
                phase: p.phase,
              })),
            };
          }

          if (!projectName) {
            return { error: "Provide a projectName to search for, or set listAll: true" };
          }

          // Run project DB lookup + communication searches IN PARALLEL so the
          // LLM always has email/Teams/OneDrive context regardless of whether
          // it explicitly calls searchEmails or searchTeamsMessages.
          const [dbResult, emailResult, teamsResult, docsResult] = await Promise.all([
            supabase
              .from("projects")
              .select("id, name, phase")
              .eq("archived", false)
              .ilike("name", `%${projectName}%`)
              .order("name", { ascending: true })
              .limit(5),
            searchDocumentChunksByCategory({
              supabase,
              query: projectName,
              category: "email",
              matchCount: 6,
              sourceLabel: "email",
            }),
            searchDocumentChunksByCategory({
              supabase,
              query: projectName,
              category: "teams_message",
              matchCount: 6,
              sourceLabel: "Teams message",
            }),
            searchDocumentChunksByCategory({
              supabase,
              query: projectName,
              category: "document",
              matchCount: 4,
              sourceLabel: "document",
            }),
          ]);

          const { data, error } = dbResult;
          if (error) return { error: error.message };
          const matches = (data ?? []) as unknown as AnyRow[];

          const communicationsNote =
            "IMPORTANT: The following emails, Teams messages, and documents were retrieved automatically. " +
            "Use this communication intelligence to answer questions about recent activity, even if the project is not found in the database. " +
            "Lead with the most recent and actionable signals from emails and Teams before diving into project data.";

          if (matches.length === 0) {
            return {
              matches: [],
              message: `No projects found matching "${projectName}" in the database. However, communications data was searched — use the emails, Teams messages, and documents below to answer questions about this project.`,
              communicationsNote,
              emails: emailResult,
              teamsMessages: teamsResult,
              documents: docsResult,
            };
          }

          return {
            matches: matches.map((p) => ({
              id: p.id,
              name: p.name,
              phase: p.phase,
            })),
            bestMatch: { id: matches[0].id, name: matches[0].name },
            communicationsNote,
            emails: emailResult,
            teamsMessages: teamsResult,
            documents: docsResult,
          };
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 16. searchEmails — Outlook emails via Microsoft Graph
    // -----------------------------------------------------------------

    searchEmails: tool({
      description:
        "Search Outlook email threads synced from Microsoft 365. " +
        "Use this when the user asks about emails, email conversations, " +
        "messages sent or received about a topic, or when they want to " +
        "know what was communicated via email (e.g. 'any emails about the permit delay?', " +
        "'what did we send to the GC about change orders?'). " +
        "Returns email subject, sender/recipients, date, and relevant content. " +
        "Always cite results as 'email from [participants] on [date]'.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "What to search for in emails — e.g. 'permit delay notification' or 'invoice dispute with Turner'",
          ),
        matchCount: z
          .number()
          .optional()
          .default(8)
          .describe("Number of email chunks to return"),
      }),
      execute: withTrace(
        "searchEmails",
        options,
        async ({ query, matchCount }) => {
          return searchDocumentChunksByCategory({
            supabase,
            query,
            category: "email",
            matchCount: matchCount ?? 8,
            sourceLabel: "email",
          });
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 17. searchTeamsMessages — Microsoft Teams channel messages
    // -----------------------------------------------------------------

    searchTeamsMessages: tool({
      description:
        "Search Microsoft Teams channel message threads. " +
        "Use this when the user asks about Teams conversations, " +
        "channel discussions, or anything communicated in Teams " +
        "(e.g. 'what did the team say about the schedule in Teams?', " +
        "'find Teams messages about the subcontractor issue'). " +
        "Returns channel name, participants, date, and message content. " +
        "Always cite results as 'Teams message in [channel] on [date]'.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "What to search for in Teams messages — e.g. 'schedule delay discussion' or 'RFI response from Hensel'",
          ),
        matchCount: z
          .number()
          .optional()
          .default(8)
          .describe("Number of Teams message chunks to return"),
      }),
      execute: withTrace(
        "searchTeamsMessages",
        options,
        async ({ query, matchCount }) => {
          return searchDocumentChunksByCategory({
            supabase,
            query,
            category: "teams_message",
            matchCount: matchCount ?? 8,
            sourceLabel: "Teams message",
          });
        },
      ),
    }),

    // -----------------------------------------------------------------
    // 18. searchExternalDocuments — OneDrive files and uploaded documents
    // -----------------------------------------------------------------

    searchExternalDocuments: tool({
      description:
        "Search OneDrive files and uploaded project documents (PDFs, Word docs, spreadsheets, etc.). " +
        "Use this when the user asks about specific documents, reports, specs, or files " +
        "(e.g. 'find the geotechnical report', 'what does the contract say about liquidated damages?', " +
        "'search the RFP document for insurance requirements'). " +
        "Distinct from meeting transcripts — this searches files and documents. " +
        "Always cite results as 'document: [title] ([date if available])'.",
      inputSchema: z.object({
        query: z
          .string()
          .describe(
            "What to search for in documents — e.g. 'liquidated damages clause' or 'geotechnical boring results'",
          ),
        matchCount: z
          .number()
          .optional()
          .default(8)
          .describe("Number of document chunks to return"),
      }),
      execute: withTrace(
        "searchExternalDocuments",
        options,
        async ({ query, matchCount }) => {
          return searchDocumentChunksByCategory({
            supabase,
            query,
            category: "document",
            matchCount: matchCount ?? 8,
            sourceLabel: "document",
          });
        },
      ),
    }),
  };
}

// ---------------------------------------------------------------------------
// Shared helper: embed query → search document_chunks filtered by category
// ---------------------------------------------------------------------------
async function searchDocumentChunksByCategory({
  supabase,
  query,
  category,
  matchCount,
  sourceLabel,
}: {
  supabase: ReturnType<typeof createServiceClient>;
  query: string;
  category: string;
  matchCount: number;
  sourceLabel: string;
}) {
  try {
    const openaiClient = getOpenAI();

    const embeddingResponse = await openaiClient.embeddings.create({
      model: "text-embedding-3-large",
      dimensions: 3072,
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc(
      "search_document_chunks_by_category",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        filter_category: category,
        match_count: matchCount,
        match_threshold: 0.25,
      },
    );

    if (error) return { error: (error as { message: string }).message };

    type ChunkRow = {
      chunk_id: string;
      document_id: string;
      chunk_index: number;
      chunk_text: string;
      similarity: number;
      doc_title: string | null;
      doc_category: string | null;
      doc_source: string | null;
      doc_type: string | null;
      doc_date: string | null;
      doc_participants: string | null;
      doc_tags: string | null;
      doc_project_id: number | null;
      doc_metadata: Record<string, unknown> | null;
      doc_created_at: string | null;
    };

    const rows = (data ?? []) as ChunkRow[];

    if (rows.length === 0) {
      return {
        results: [],
        message: `No ${sourceLabel}s found for "${query}". The sync may not have run yet, or no matching content exists.`,
      };
    }

    // Deduplicate by document_id — take best-scoring chunk per document
    const bestByDoc = new Map<string, ChunkRow>();
    for (const row of rows) {
      const existing = bestByDoc.get(row.document_id);
      if (!existing || row.similarity > existing.similarity) {
        bestByDoc.set(row.document_id, row);
      }
    }

    const results = Array.from(bestByDoc.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, matchCount);

    return {
      query,
      sourceType: sourceLabel,
      resultCount: results.length,
      results: results.map((r) => ({
        title: r.doc_title ?? "(untitled)",
        content: r.chunk_text.substring(0, 2000),
        similarity: Math.round(r.similarity * 1000) / 1000,
        date: r.doc_date ?? r.doc_created_at,
        participants: r.doc_participants,
        source: r.doc_source,
        type: r.doc_type,
        projectId: r.doc_project_id,
        documentId: r.document_id,
        chunkIndex: r.chunk_index,
        // Pre-formatted citation for the model to use directly
        citation: formatCitation(sourceLabel, r),
      })),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return {
      error: `${sourceLabel} search failed: ${msg}`,
    };
  }
}

type ChunkResultRow = {
  doc_title: string | null;
  doc_date: string | null;
  doc_created_at: string | null;
  doc_participants: string | null;
  doc_source: string | null;
};

function formatCitation(sourceLabel: string, r: ChunkResultRow): string {
  const date = r.doc_date ?? r.doc_created_at;
  const dateStr = date
    ? new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  if (sourceLabel === "email") {
    const parts = [r.doc_participants ? `from ${r.doc_participants}` : null, dateStr].filter(Boolean);
    return `Email${parts.length ? " " + parts.join(", ") : ""}: "${r.doc_title ?? "untitled"}"`;
  }

  if (sourceLabel === "Teams message") {
    const parts = [r.doc_source ? `in ${r.doc_source}` : null, dateStr].filter(Boolean);
    return `Teams message${parts.length ? " " + parts.join(", ") : ""}: "${r.doc_title ?? "untitled"}"`;
  }

  // document
  return `Document: "${r.doc_title ?? "untitled"}"${dateStr ? ` (${dateStr})` : ""}`;
}
