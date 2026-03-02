import { tool } from "ai";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

type AnyRow = Record<string, any>;

type ToolTracePayload = {
  tool: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  timestamp: string;
};

type CreateProjectToolsOptions = {
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
  options: CreateProjectToolsOptions,
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

export function createProjectTools(
  _userId: string,
  options: CreateProjectToolsOptions = {},
) {
  const supabase = createServiceClient();

  return {
    getPortfolioOverview: tool({
      description:
        "Get a strategic overview of the project portfolio. By default shows only CURRENT-phase " +
        "projects (the active ones). Pulls contracts, change events, recent meeting activity, " +
        "and action items. Use this FIRST when the user asks about projects or portfolio status. " +
        "The richest data is in meeting transcripts and action items — lead with those insights.",
      inputSchema: z.object({
        phase: z
          .string()
          .optional()
          .default("Current")
          .describe(
            "Project phase filter: 'Current' (default), 'Complete', 'Estimating', 'Planning', or 'all'",
          ),
      }),
      execute: withTrace(
        "getPortfolioOverview",
        options,
        async ({ phase }) => {
        // Fetch projects filtered by phase
        let projectQuery = supabase
          .from("projects")
          .select("*")
          .eq("archived", false)
          .order("name", { ascending: true })
          .limit(50);

        if (phase && phase !== "all") {
          projectQuery = projectQuery.eq("phase", phase);
        }

        const { data: projectRows, error } = await projectQuery;
        if (error) return { error: error.message };
        const projects = (projectRows ?? []) as AnyRow[];
        const projectIds = projects.map((p) => p.id);

        // Parallel fetch: contracts, change events, issues, meetings
        const [financialRes, ceRes, issueRes, meetingRes, healthRes] =
          await Promise.all([
            supabase
              .from("prime_contract_financial_summary")
              .select("*")
              .in("project_id", projectIds),
            supabase
              .from("change_events_summary")
              .select("*")
              .in("project_id", projectIds),
            supabase
              .from("project_issue_summary")
              .select("*")
              .in("project_id", projectIds),
            supabase
              .from("document_metadata")
              .select(
                "id, title, date, project_id, project, summary, overview, participants, duration_minutes",
              )
              .in("project_id", projectIds)
              .order("date", { ascending: false })
              .limit(100),
            supabase
              .from("project_health_dashboard")
              .select("*")
              .in("id", projectIds),
          ]);

        const financials = (financialRes.data ?? []) as AnyRow[];
        const changeEvents = (ceRes.data ?? []) as AnyRow[];
        const issues = (issueRes.data ?? []) as AnyRow[];
        const meetings = (meetingRes.data ?? []) as AnyRow[];
        const health = (healthRes.data ?? []) as AnyRow[];

        // Index lookups
        const nameMap = new Map<number, string>();
        projects.forEach((p) => nameMap.set(p.id, p.name));

        const financialsByProject = new Map<number, AnyRow[]>();
        financials.forEach((f) => {
          if (!f.project_id) return;
          const arr = financialsByProject.get(f.project_id) || [];
          arr.push(f);
          financialsByProject.set(f.project_id, arr);
        });

        const ceByProject = new Map<number, AnyRow[]>();
        changeEvents.forEach((ce) => {
          if (!ce.project_id) return;
          const arr = ceByProject.get(ce.project_id) || [];
          arr.push(ce);
          ceByProject.set(ce.project_id, arr);
        });

        const issuesByProject = new Map<number, AnyRow>();
        issues.forEach((i) => {
          if (i.project_id) issuesByProject.set(i.project_id, i);
        });

        const healthByProject = new Map<number, AnyRow>();
        health.forEach((h) => {
          if (h.id) healthByProject.set(h.id, h);
        });

        // Meeting activity per project
        const meetingsByProject = new Map<number, AnyRow[]>();
        meetings.forEach((m) => {
          if (!m.project_id) return;
          const arr = meetingsByProject.get(m.project_id) || [];
          arr.push(m);
          meetingsByProject.set(m.project_id, arr);
        });

        // Recent meeting insights (summaries and overviews are the richest data)
        const recentMeetingInsights: AnyRow[] = [];
        meetings.forEach((m) => {
          const overview = m.summary || m.overview;
          if (!overview) return;
          recentMeetingInsights.push({
            meeting: m.title,
            date: m.date,
            project: nameMap.get(m.project_id) ?? m.project,
            keyPoints: overview.substring(0, 400),
          });
        });

        // Build enriched project list
        const enrichedProjects = projects.map((p) => {
          const h = healthByProject.get(p.id);
          const iss = issuesByProject.get(p.id);
          const fins = financialsByProject.get(p.id) || [];
          const ces = ceByProject.get(p.id) || [];
          const pMeetings = meetingsByProject.get(p.id) || [];

          const totalContractValue = fins.reduce(
            (sum: number, f: AnyRow) =>
              sum +
              (f.revised_contract_amount ?? f.original_contract_amount ?? 0),
            0,
          );
          const openCEs = ces.filter(
            (ce) => ce.status !== "closed" && ce.status !== "void",
          );

          return {
            id: p.id,
            name: p.name,
            projectNumber: p.project_number,
            client: p.client,
            phase: p.phase,
            state: p.state,
            summary: p.summary,
            totalContractValue,
            openChangeEvents: openCEs.length,
            totalIssues: iss?.total_issues ?? 0,
            meetingCount: pMeetings.length,
            lastMeetingDate: pMeetings[0]?.date ?? null,
            lastMeetingTitle: pMeetings[0]?.title ?? null,
            healthStatus: p.health_status,
            healthScore: p.health_score,
            openCriticalItems: h?.open_critical_items ?? 0,
          };
        });

        // Sort by activity (meetings) descending
        enrichedProjects.sort((a, b) => b.meetingCount - a.meetingCount);

        // Portfolio-level contract totals
        const totalContractValue = financials.reduce(
          (s, f) =>
            s +
            (f.revised_contract_amount ?? f.original_contract_amount ?? 0),
          0,
        );

        return {
          portfolioSummary: {
            phase,
            totalProjects: enrichedProjects.length,
            projectsWithContracts: financials.length,
            totalContractValue,
            openChangeEvents: changeEvents.filter(
              (ce) => ce.status !== "closed" && ce.status !== "void",
            ).length,
            totalMeetingsRecorded: meetings.length,
            meetingsWithInsights: recentMeetingInsights.length,
          },
          projects: enrichedProjects,
          recentMeetingInsights: recentMeetingInsights.slice(0, 15),
          recentMeetings: meetings.slice(0, 10).map((m) => ({
            title: m.title,
            date: m.date,
            project: nameMap.get(m.project_id) ?? m.project,
            summary: (m.summary || m.overview || "").substring(0, 300),
            participants: m.participants,
          })),
        };
        },
      ),
    }),

    getProjectRiskAnalysis: tool({
      description:
        "Deep risk analysis for a specific project. Pulls AI-identified risks, " +
        "change order exposure, overdue RFIs, schedule slippage, budget data, and " +
        "recent meeting insights. Use when assessing a project's risk profile.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for"),
      }),
      execute: withTrace(
        "getProjectRiskAnalysis",
        options,
        async ({ projectId, projectName }) => {
        let resolvedId = projectId;
        let resolvedName = projectName;

        if (!resolvedId && projectName) {
          const { data } = await supabase
            .from("projects")
            .select("id, name")
            .ilike("name", `%${projectName}%`)
            .limit(1)
            .single();
          if (data) {
            resolvedId = data.id;
            resolvedName = data.name ?? undefined;
          } else {
            return { error: `No project found matching "${projectName}"` };
          }
        }

        if (!resolvedId) {
          return { error: "Provide projectId or projectName" };
        }

        const [
          insightsRes,
          changeOrdersRes,
          rfisRes,
          scheduleRes,
          projectRes,
          budgetRes,
          meetingsRes,
        ] = await Promise.all([
          supabase
            .from("ai_insights")
            .select("*")
            .eq("project_id", resolvedId)
            .in("resolved", [0])
            .order("severity", { ascending: true })
            .limit(20),
          supabase
            .from("change_orders")
            .select("id, title, amount, status, due_date, description")
            .eq("project_id", resolvedId)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("rfis")
            .select("*")
            .eq("project_id", resolvedId)
            .neq("status", "closed")
            .order("due_date", { ascending: true })
            .limit(20),
          supabase
            .from("schedule_tasks")
            .select("*")
            .eq("project_id", resolvedId)
            .order("finish_date", { ascending: true })
            .limit(50),
          supabase
            .from("projects")
            .select("*")
            .eq("id", resolvedId)
            .single(),
          supabase
            .from("v_budget_lines")
            .select(
              "id, description, original_amount, revised_budget, approved_co_total",
            )
            .eq("project_id", resolvedId),
          supabase
            .from("document_metadata")
            .select("title, date, summary, overview, participants")
            .eq("project_id", resolvedId)
            .order("date", { ascending: false })
            .limit(10),
        ]);

        const project = projectRes.data as AnyRow | null;
        const insights = (insightsRes.data ?? []) as AnyRow[];
        const changeOrders = (changeOrdersRes.data ?? []) as AnyRow[];
        const rfis = (rfisRes.data ?? []) as AnyRow[];
        const tasks = (scheduleRes.data ?? []) as AnyRow[];
        const budgetLines = (budgetRes.data ?? []) as AnyRow[];
        const recentMeetings = (meetingsRes.data ?? []) as AnyRow[];

        const now = new Date().toISOString().split("T")[0];
        const overdueTasks = tasks.filter(
          (t) =>
            t.finish_date &&
            t.finish_date < now &&
            t.status !== "completed" &&
            (t.percent_complete ?? 0) < 100,
        );
        const milestonesAtRisk = tasks.filter(
          (t) =>
            t.is_milestone &&
            t.finish_date &&
            t.finish_date < now &&
            t.status !== "completed",
        );

        const pendingCOAmount = changeOrders
          .filter(
            (co) => co.status !== "approved" && co.status !== "rejected",
          )
          .reduce((s, co) => s + (co.amount ?? 0), 0);
        const approvedCOAmount = changeOrders
          .filter((co) => co.status === "approved")
          .reduce((s, co) => s + (co.amount ?? 0), 0);

        const totalOriginalBudget = budgetLines.reduce(
          (s, b) => s + (b.original_amount ?? 0),
          0,
        );
        const totalRevisedBudget = budgetLines.reduce(
          (s, b) => s + (b.revised_budget ?? 0),
          0,
        );
        const budgetGrowthPct =
          totalOriginalBudget > 0
            ? Math.round(
                ((totalRevisedBudget - totalOriginalBudget) /
                  totalOriginalBudget) *
                  100,
              )
            : 0;

        const overdueRFIs = rfis.filter(
          (r) => r.due_date && r.due_date < now,
        );
        const criticalInsights = insights.filter(
          (i) => i.severity === "critical" || i.severity === "high",
        );

        return {
          project: {
            id: resolvedId,
            name: resolvedName ?? project?.name,
            phase: project?.phase,
            healthStatus: project?.health_status,
            healthScore: project?.health_score,
            completionPct: project?.completion_percentage,
            budget: project?.budget,
            budgetUsed: project?.budget_used,
          },
          riskSummary: {
            overallRiskLevel:
              criticalInsights.length > 3 || overdueRFIs.length > 5
                ? "HIGH"
                : criticalInsights.length > 0 || overdueRFIs.length > 2
                  ? "MEDIUM"
                  : "LOW",
            criticalInsightCount: criticalInsights.length,
            totalOpenInsights: insights.length,
            overdueTaskCount: overdueTasks.length,
            milestonesAtRisk: milestonesAtRisk.length,
            overdueRFICount: overdueRFIs.length,
            pendingChangeOrderExposure: pendingCOAmount,
            approvedChangeOrderTotal: approvedCOAmount,
            budgetGrowthPct,
          },
          criticalInsights: criticalInsights.slice(0, 10).map((i) => ({
            title: i.title,
            description: i.description,
            severity: i.severity,
            type: i.insight_type,
            financialImpact: i.financial_impact,
            timelineImpactDays: i.timeline_impact_days,
            businessImpact: i.business_impact,
          })),
          overdueItems: {
            tasks: overdueTasks.slice(0, 10).map((t) => ({
              name: t.name,
              finishDate: t.finish_date,
              percentComplete: t.percent_complete,
              isMilestone: t.is_milestone,
            })),
            rfis: overdueRFIs.slice(0, 10).map((r) => ({
              number: r.number,
              subject: r.subject,
              dueDate: r.due_date,
              ballInCourt: r.ball_in_court,
            })),
          },
          changeOrderExposure: {
            totalPending: pendingCOAmount,
            totalApproved: approvedCOAmount,
            count: changeOrders.length,
          },
          budgetAnalysis: {
            originalBudget: totalOriginalBudget,
            revisedBudget: totalRevisedBudget,
            budgetGrowthPct,
            lineCount: budgetLines.length,
          },
          recentMeetings: recentMeetings.slice(0, 5).map((m) => ({
            title: m.title,
            date: m.date,
            keyPoints: (m.summary || m.overview || "").substring(0, 400),
            participants: m.participants,
          })),
        };
        },
      ),
    }),

    getFinancialAnalysis: tool({
      description:
        "Detailed financial analysis across current projects or a specific project. " +
        "Computes contract values, change order trends, and flags financial concerns. " +
        "Use when asked about money, budgets, contracts, costs, or profitability.",
      inputSchema: z.object({
        projectId: z
          .number()
          .optional()
          .describe("Optional project ID to scope the analysis"),
      }),
      execute: withTrace(
        "getFinancialAnalysis",
        options,
        async ({ projectId }) => {
        let financialQuery = supabase
          .from("prime_contract_financial_summary")
          .select("*");
        if (projectId) {
          financialQuery = financialQuery.eq("project_id", projectId);
        }
        const { data: financialRows } = await financialQuery;
        const financials = (financialRows ?? []) as AnyRow[];

        let ceQuery = supabase.from("change_events_summary").select("*");
        if (projectId) {
          ceQuery = ceQuery.eq("project_id", projectId);
        }
        const { data: ceRows } = await ceQuery;
        const changeEvents = (ceRows ?? []) as AnyRow[];

        // Get project names for context
        const projIds = Array.from(
          new Set(financials.map((f) => f.project_id).filter(Boolean)),
        );
        const { data: projRows } = await supabase
          .from("projects")
          .select("id, name, phase")
          .in("id", projIds.length > 0 ? projIds : [0]);
        const projMap = new Map<number, AnyRow>();
        (projRows ?? []).forEach((p: AnyRow) => projMap.set(p.id, p));

        const totalOriginalContracts = financials.reduce(
          (s, f) => s + (f.original_contract_amount ?? 0),
          0,
        );
        const totalRevisedContracts = financials.reduce(
          (s, f) => s + (f.revised_contract_amount ?? 0),
          0,
        );
        const totalInvoiced = financials.reduce(
          (s, f) => s + (f.invoiced_amount ?? 0),
          0,
        );
        const totalPayments = financials.reduce(
          (s, f) => s + (f.payments_received ?? 0),
          0,
        );
        const totalPendingCOs = financials.reduce(
          (s, f) => s + (f.pending_change_orders ?? 0),
          0,
        );
        const totalApprovedCOs = financials.reduce(
          (s, f) => s + (f.approved_change_orders ?? 0),
          0,
        );

        const contractGrowthPct =
          totalOriginalContracts > 0
            ? Math.round(
                ((totalRevisedContracts - totalOriginalContracts) /
                  totalOriginalContracts) *
                  100,
              )
            : 0;

        const openCEs = changeEvents.filter(
          (ce) => ce.status !== "closed" && ce.status !== "void",
        );

        const financialConcerns: string[] = [];
        if (contractGrowthPct > 10) {
          financialConcerns.push(
            `Contract values have grown ${contractGrowthPct}% from original amounts`,
          );
        }
        if (
          totalPendingCOs > 0 &&
          totalPendingCOs > totalOriginalContracts * 0.05
        ) {
          financialConcerns.push(
            `Pending change orders ($${totalPendingCOs.toLocaleString()}) exceed 5% of original contract value`,
          );
        }
        if (totalInvoiced > 0 && totalPayments / totalInvoiced < 0.8) {
          financialConcerns.push(
            `Collection rate is ${Math.round((totalPayments / totalInvoiced) * 100)}% — review receivables`,
          );
        }

        return {
          summary: {
            totalOriginalContractValue: totalOriginalContracts,
            totalRevisedContractValue: totalRevisedContracts,
            contractGrowthPct,
            totalInvoiced,
            totalPaymentsReceived: totalPayments,
            collectionRate:
              totalInvoiced > 0
                ? Math.round((totalPayments / totalInvoiced) * 100)
                : 0,
            totalApprovedChangeOrders: totalApprovedCOs,
            totalPendingChangeOrders: totalPendingCOs,
            openChangeEvents: openCEs.length,
          },
          financialConcerns,
          contracts: financials.map((f) => ({
            title: f.title,
            projectName: projMap.get(f.project_id)?.name,
            projectPhase: projMap.get(f.project_id)?.phase,
            originalAmount: f.original_contract_amount,
            revisedAmount: f.revised_contract_amount,
            invoiced: f.invoiced_amount,
            paymentsReceived: f.payments_received,
            remainingBalance: f.remaining_balance,
            percentPaid: f.percent_paid,
            pendingCOs: f.pending_change_orders,
            approvedCOs: f.approved_change_orders,
            status: f.status,
          })),
        };
        },
      ),
    }),

    getProjectBudgetSummary: tool({
      description:
        "Get a true project budget summary from budget line data (NOT contract value). " +
        "Use this FIRST for questions like 'total budget', 'budget amount', or 'budget status' " +
        "for a specific project.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to resolve if projectId is unknown"),
      }),
      execute: withTrace(
        "getProjectBudgetSummary",
        options,
        async ({ projectId, projectName }) => {
          let resolvedId = projectId;
          let resolvedProject: AnyRow | null = null;

          if (!resolvedId && projectName) {
            const { data, error } = await supabase
              .from("projects")
              .select("id, name, phase")
              .ilike("name", `%${projectName}%`)
              .limit(1)
              .single();
            if (error || !data) {
              return { error: `No project found matching "${projectName}"` };
            }
            resolvedId = data.id;
            resolvedProject = data;
          }

          if (!resolvedId) {
            return { error: "Provide projectId or projectName" };
          }

          if (!resolvedProject) {
            const { data } = await supabase
              .from("projects")
              .select("id, name, phase")
              .eq("id", resolvedId)
              .single();
            resolvedProject = data ?? null;
          }

          const [budgetRes, contractRes] = await Promise.all([
            supabase
              .from("v_budget_lines")
              .select(
                "id, original_amount, revised_budget, approved_co_total, budget_mod_total",
              )
              .eq("project_id", resolvedId),
            supabase
              .from("prime_contract_financial_summary")
              .select(
                "title, original_contract_amount, revised_contract_amount, approved_change_orders, pending_change_orders, invoiced_amount, payments_received",
              )
              .eq("project_id", resolvedId),
          ]);

          const budgetLines = (budgetRes.data ?? []) as AnyRow[];
          const contractRows = (contractRes.data ?? []) as AnyRow[];

          const totalOriginalBudget = budgetLines.reduce(
            (sum, row) => sum + asNumber(row.original_amount),
            0,
          );
          const totalRevisedBudget = budgetLines.reduce(
            (sum, row) => sum + asNumber(row.revised_budget),
            0,
          );
          const totalApprovedBudgetChanges = budgetLines.reduce(
            (sum, row) => sum + asNumber(row.approved_co_total),
            0,
          );
          const totalBudgetModifications = budgetLines.reduce(
            (sum, row) => sum + asNumber(row.budget_mod_total),
            0,
          );
          const budgetDelta = totalRevisedBudget - totalOriginalBudget;
          const budgetGrowthPct =
            totalOriginalBudget > 0
              ? Math.round((budgetDelta / totalOriginalBudget) * 100)
              : 0;

          const contractTotals = {
            originalContractValue: contractRows.reduce(
              (sum, row) => sum + asNumber(row.original_contract_amount),
              0,
            ),
            revisedContractValue: contractRows.reduce(
              (sum, row) => sum + asNumber(row.revised_contract_amount),
              0,
            ),
            approvedChangeOrders: contractRows.reduce(
              (sum, row) => sum + asNumber(row.approved_change_orders),
              0,
            ),
            pendingChangeOrders: contractRows.reduce(
              (sum, row) => sum + asNumber(row.pending_change_orders),
              0,
            ),
            invoicedAmount: contractRows.reduce(
              (sum, row) => sum + asNumber(row.invoiced_amount),
              0,
            ),
            paymentsReceived: contractRows.reduce(
              (sum, row) => sum + asNumber(row.payments_received),
              0,
            ),
          };

          return {
            project: {
              id: resolvedId,
              name: resolvedProject?.name ?? projectName ?? null,
              phase: resolvedProject?.phase ?? null,
            },
            budgetSummary: {
              totalOriginalBudget,
              totalRevisedBudget,
              totalApprovedBudgetChanges,
              totalBudgetModifications,
              budgetDelta,
              budgetGrowthPct,
              budgetLineCount: budgetLines.length,
            },
            contractContext: contractTotals,
            dataNotes: [
              "Budget totals are from v_budget_lines (budget data).",
              "Contract totals are provided separately for context.",
            ],
          };
        },
      ),
    }),

    getActionItemsAndInsights: tool({
      description:
        "Get priority action items from recent meetings, unresolved AI-surfaced " +
        "insights, and overdue RFIs. This is the PRIMARY tool for understanding " +
        "what needs attention NOW. Meeting action items are the richest data source. " +
        "Use when asked about what needs attention, what's urgent, or to-do items.",
      inputSchema: z.object({
        projectId: z
          .number()
          .optional()
          .describe("Optional project ID to filter by"),
        maxResults: z
          .number()
          .optional()
          .default(20)
          .describe("Max results to return"),
      }),
      execute: withTrace(
        "getActionItemsAndInsights",
        options,
        async ({ projectId, maxResults }) => {
        // get_priority_insights RPC has a SQL type bug — fall back gracefully
        let priorityInsights: AnyRow[] = [];
        try {
          const { data: priorityRows, error: rpcError } = await supabase.rpc(
            "get_priority_insights",
            {
              p_limit: maxResults ?? 20,
              ...(projectId ? { p_project_id: projectId } : {}),
            },
          );
          if (!rpcError && priorityRows) {
            priorityInsights = priorityRows as AnyRow[];
          }
        } catch {
          // RPC broken — using ai_insights fallback below
        }

        let insightQuery = supabase
          .from("ai_insights")
          .select("*")
          .in("resolved", [0])
          .order("created_at", { ascending: false })
          .limit(maxResults ?? 20);

        if (projectId) {
          insightQuery = insightQuery.eq("project_id", projectId);
        }
        const { data: insightRows } = await insightQuery;
        const insights = (insightRows ?? []) as AnyRow[];

        // Meeting summaries — the richest data source for what needs attention
        let docQuery = supabase
          .from("document_metadata")
          .select("title, date, project, project_id, summary, overview, participants")
          .order("date", { ascending: false })
          .limit(20);

        if (projectId) {
          docQuery = docQuery.eq("project_id", projectId);
        }
        const { data: docRows } = await docQuery;
        const docs = ((docRows ?? []) as AnyRow[]).filter(
          (d) => d.summary || d.overview,
        );

        const now = new Date().toISOString().split("T")[0];
        let rfiQuery = supabase
          .from("rfis")
          .select("id, number, subject, status, due_date, ball_in_court")
          .neq("status", "closed")
          .lt("due_date", now)
          .order("due_date", { ascending: true })
          .limit(10);

        if (projectId) {
          rfiQuery = rfiQuery.eq("project_id", projectId);
        }
        const { data: rfiRows } = await rfiQuery;
        const overdueRFIs = (rfiRows ?? []) as AnyRow[];

        return {
          priorityItems: priorityInsights.map((i) => ({
            title: i.title,
            description: i.description,
            type: i.insight_type,
            severity: i.severity,
            daysUntilDue: i.days_until_due,
            dueDate: i.due_date,
            assignee: i.assignee,
          })),
          unresolvedInsights: insights.map((i) => ({
            title: i.title,
            description: i.description,
            type: i.insight_type,
            severity: i.severity,
            financialImpact: i.financial_impact,
            timelineImpactDays: i.timeline_impact_days,
            projectName: i.project_name,
            businessImpact: i.business_impact,
          })),
          meetingInsights: docs.map((d) => ({
            meeting: d.title,
            date: d.date,
            project: d.project,
            keyPoints: (d.summary || d.overview || "").substring(0, 400),
          })),
          overdueRFIs: overdueRFIs.map((r) => ({
            number: r.number,
            subject: r.subject,
            status: r.status,
            dueDate: r.due_date,
            ballInCourt: r.ball_in_court,
          })),
        };
        },
      ),
    }),

    searchDocuments: tool({
      description:
        "Search meeting transcripts, notes, and project documents by keyword. " +
        "Meetings are stored in the document_metadata table. " +
        "Use when investigating specific topics, decisions, or looking for " +
        "context on a particular issue discussed in meetings.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Search keywords or phrases to find in documents"),
        projectId: z
          .number()
          .optional()
          .describe("Optional project ID to scope the search"),
        maxResults: z
          .number()
          .optional()
          .default(10)
          .describe("Max results to return"),
      }),
      execute: withTrace(
        "searchDocuments",
        options,
        async ({ query, projectId, maxResults }) => {
        if (projectId) {
          const { data: docRows } = await supabase
            .from("document_metadata")
            .select("*")
            .eq("project_id", projectId)
            .textSearch("content", query.split(" ").join(" & "))
            .order("date", { ascending: false })
            .limit(maxResults ?? 10);
          const docs = (docRows ?? []) as AnyRow[];

          if (docs.length) {
            return {
              results: docs.map((d) => ({
                id: d.id,
                title: d.title,
                date: d.date,
                participants: d.participants,
                category: d.category,
                summary: d.summary ?? d.overview,
                actionItems: d.action_items,
                bulletPoints: d.bullet_points,
              })),
            };
          }
        }

        const { data, error } = await supabase.rpc(
          "full_text_search_meetings",
          {
            search_query: query,
            match_count: maxResults ?? 10,
          },
        );

        if (error) return { error: error.message };
        const results = (data ?? []) as AnyRow[];
        if (!results.length) {
          return {
            results: [],
            message: `No documents found matching "${query}"`,
          };
        }

        return {
          results: results.map((r) => ({
            id: r.id,
            title: r.title,
            date: r.date,
            category: r.category,
            participants: r.participants,
            content: r.content?.substring(0, 1000),
          })),
        };
        },
      ),
    }),

    getProjectDetails: tool({
      description:
        "Get comprehensive details for a specific project including contracts, " +
        "schedule, RFIs, and recent meeting activity with action items. " +
        "Use when diving deep into a single project.",
      inputSchema: z.object({
        projectId: z.number().optional().describe("Project ID if known"),
        projectName: z
          .string()
          .optional()
          .describe("Project name to search for (partial match)"),
      }),
      execute: withTrace(
        "getProjectDetails",
        options,
        async ({ projectId, projectName }) => {
        let project: AnyRow | null = null;

        if (projectId) {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .single();
          if (error) return { error: error.message };
          project = data as AnyRow;
        } else if (projectName) {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .ilike("name", `%${projectName}%`)
            .limit(1)
            .single();
          if (error)
            return { error: `No project found matching "${projectName}"` };
          project = data as AnyRow;
        } else {
          return { error: "Provide either projectId or projectName" };
        }

        if (!project) return { error: "Project not found" };

        const [contractsRes, tasksRes, rfisRes, recentDocsRes] =
          await Promise.all([
            supabase
              .from("prime_contracts")
              .select("id, title, status, contract_amount, executed_date")
              .eq("project_id", project.id)
              .limit(10),
            supabase
              .from("schedule_tasks")
              .select("*")
              .eq("project_id", project.id)
              .order("start_date", { ascending: true })
              .limit(30),
            supabase
              .from("rfis")
              .select("id, number, subject, status, due_date")
              .eq("project_id", project.id)
              .order("created_at", { ascending: false })
              .limit(10),
            supabase
              .from("document_metadata")
              .select(
                "title, date, summary, overview, participants, category",
              )
              .eq("project_id", project.id)
              .order("date", { ascending: false })
              .limit(10),
          ]);

        const tasks = (tasksRes.data ?? []) as AnyRow[];
        const recentDocs = (recentDocsRes.data ?? []) as AnyRow[];

        return {
          project: {
            id: project.id,
            name: project.name,
            projectNumber: project.project_number,
            client: project.client,
            phase: project.phase ?? project.current_phase,
            state: project.state,
            address: project.address,
            budget: project.budget,
            budgetUsed: project.budget_used,
            healthStatus: project.health_status,
            completionPct: project.completion_percentage,
            deliveryMethod: project.delivery_method,
            workScope: project.work_scope,
            summary: project.summary,
            startDate: project["start date"],
            estCompletion: project["est completion"],
          },
          contracts: contractsRes.data ?? [],
          scheduleTasks: tasks.map((t) => ({
            name: t.name,
            status: t.status,
            startDate: t.start_date,
            finishDate: t.finish_date,
            percentComplete: t.percent_complete,
            isMilestone: t.is_milestone,
          })),
          openRFIs: (rfisRes.data ?? []).map((r) => ({
            number: r.number,
            subject: r.subject,
            status: r.status,
            dueDate: r.due_date,
          })),
          recentMeetings: recentDocs.map((d) => ({
            title: d.title,
            date: d.date,
            keyPoints: (d.summary || d.overview || "").substring(0, 400),
            participants: d.participants,
          })),
        };
        },
      ),
    }),
  };
}
