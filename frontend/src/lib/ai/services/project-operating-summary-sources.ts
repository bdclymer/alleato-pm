import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/types/database.types";
import type {
  ProjectIntelligenceSummary,
  ProjectIntelligenceSummarySource,
} from "@/lib/ai/services/project-intelligence-summary";
import { summarizeProjectIntelligence } from "@/lib/ai/services/project-intelligence-summary";

type AlleatoSupabaseClient = SupabaseClient<Database>;

export type ProjectOperatingSourceCategory =
  | "project_detail"
  | "meeting"
  | "email"
  | "teams"
  | "document"
  | "acumatica"
  | "rfi"
  | "submittal"
  | "drawing"
  | "specification"
  | "daily_report"
  | "task"
  | "risk";

export type ProjectOperatingSummarySource = ProjectIntelligenceSummarySource & {
  category: ProjectOperatingSourceCategory;
  recordId: string;
  href?: string | null;
};

export type ProjectOperatingSourceCoverage = {
  category: ProjectOperatingSourceCategory;
  label: string;
  availableCount: number;
  sourceCount: number;
  latestAt: string | null;
  sampleTitles: string[];
  tableNames: string[];
};

export type ProjectOperatingSummarySourceSet = {
  projectId: number;
  projectName: string | null;
  generatedAt: string;
  sources: ProjectOperatingSummarySource[];
  coverage: ProjectOperatingSourceCoverage[];
  missingCategories: ProjectOperatingSourceCoverage[];
};

const DOCUMENT_PER_CATEGORY_LIMIT = 120;

const SOURCE_LIMITS = {
  documents: DOCUMENT_PER_CATEGORY_LIMIT,
  meetings: DOCUMENT_PER_CATEGORY_LIMIT,
  emails: DOCUMENT_PER_CATEGORY_LIMIT,
  teams: DOCUMENT_PER_CATEGORY_LIMIT,
  rfis: 20,
  submittals: 20,
  drawings: 20,
  specifications: 20,
  dailyLogs: 20,
  tasks: 30,
  scheduleTasks: 30,
  financialRows: 20,
} as const;

const OPERATING_SUMMARY_SOURCE_LIMIT = 96;

const categoryLabels: Record<ProjectOperatingSourceCategory, string> = {
  project_detail: "Project Details",
  meeting: "Meetings",
  email: "Emails",
  teams: "Teams",
  document: "Documents",
  acumatica: "Acumatica",
  rfi: "RFIs",
  submittal: "Submittals",
  drawing: "Drawings",
  specification: "Specifications",
  daily_report: "Daily Reports",
  task: "Tasks",
  risk: "Risks",
};

const operatingSummaryCategoryOrder: ProjectOperatingSourceCategory[] = [
  "project_detail",
  "task",
  "risk",
  "rfi",
  "submittal",
  "drawing",
  "specification",
  "daily_report",
  "acumatica",
  "meeting",
  "teams",
  "email",
  "document",
];

const OPERATING_PACKET_COMPILER_VERSION = "project-operating-summary-v1";

const sourceTypeByCategory: Record<ProjectOperatingSourceCategory, ProjectIntelligenceSummarySource["type"]> = {
  project_detail: "other",
  meeting: "meeting",
  email: "email",
  teams: "teams",
  document: "document",
  acumatica: "acumatica",
  rfi: "rfi",
  submittal: "submittal",
  drawing: "drawing",
  specification: "specification",
  daily_report: "daily_report",
  task: "task",
  risk: "risk",
};

const coverageTableNames: Record<ProjectOperatingSourceCategory, string[]> = {
  project_detail: ["projects"],
  meeting: ["document_metadata"],
  email: ["document_metadata"],
  teams: ["document_metadata"],
  document: ["document_metadata"],
  acumatica: [
    "direct_costs",
    "commitments_unified",
    "acumatica_ap_bills",
    "acumatica_change_orders",
    "acumatica_subcontracts",
    "acumatica_purchase_orders",
  ],
  rfi: ["rfis"],
  submittal: ["submittals"],
  drawing: ["drawings"],
  specification: ["specifications"],
  daily_report: ["daily_logs"],
  task: ["tasks", "schedule_tasks"],
  risk: ["tasks", "rfis", "submittals", "schedule_tasks"],
};

function compact(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function joinFields(fields: Array<[string, unknown]>): string {
  return fields
    .map(([label, value]) => {
      const text = compact(value);
      return text ? `${label}: ${text}` : null;
    })
    .filter((value): value is string => Boolean(value))
    .join(". ");
}

function safeDate(...values: unknown[]): string | null {
  for (const value of values) {
    const text = compact(value);
    if (text) return text;
  }
  return null;
}

function normalizeDocumentCategory(row: Record<string, unknown>): ProjectOperatingSourceCategory {
  const value = `${compact(row.source_system) ?? ""} ${compact(row.source) ?? ""} ${compact(row.category) ?? ""} ${compact(row.type) ?? ""}`.toLowerCase();
  if (value.includes("fireflies") || value.includes("meeting") || value.includes("transcript")) return "meeting";
  if (value.includes("outlook") || value.includes("email")) return "email";
  if (value.includes("teams") || value.includes("message") || value.includes("chat")) return "teams";
  if (value.includes("drawing") || value.includes("plan")) return "drawing";
  if (value.includes("spec")) return "specification";
  return "document";
}

function makeSource(input: {
  category: ProjectOperatingSourceCategory;
  id: string;
  recordId: string;
  title: string | null;
  projectName: string | null;
  text: string;
  capturedAt?: string | null;
  sourceUrl?: string | null;
  href?: string | null;
}): ProjectOperatingSummarySource {
  return {
    id: input.id,
    type: sourceTypeByCategory[input.category],
    category: input.category,
    recordId: input.recordId,
    title: input.title,
    projectName: input.projectName,
    text: input.text,
    capturedAt: input.capturedAt ?? null,
    sourceUrl: input.sourceUrl ?? null,
    href: input.href ?? null,
  };
}

function sourceTitle(source: ProjectOperatingSummarySource): string {
  return source.title || source.recordId;
}

function latestDate(sources: ProjectOperatingSummarySource[]): string | null {
  return sources
    .map((source) => source.capturedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
}

function buildCoverage(
  sources: ProjectOperatingSummarySource[],
  availableCounts: Partial<Record<ProjectOperatingSourceCategory, number>>,
): ProjectOperatingSourceCoverage[] {
  return (Object.keys(categoryLabels) as ProjectOperatingSourceCategory[]).map((category) => {
    const categorySources = sources.filter((source) => source.category === category);
    return {
      category,
      label: categoryLabels[category],
      availableCount: availableCounts[category] ?? categorySources.length,
      sourceCount: categorySources.length,
      latestAt: latestDate(categorySources),
      sampleTitles: categorySources.slice(0, 3).map(sourceTitle),
      tableNames: coverageTableNames[category],
    };
  });
}

function countRows(data: unknown[] | null | undefined): number {
  return Array.isArray(data) ? data.length : 0;
}

function countResult(value: { count: number | null; error: { message: string } | null }): number | null {
  if (value.error) return null;
  return typeof value.count === "number" ? value.count : null;
}

function selectOperatingSummarySources(
  sources: ProjectOperatingSummarySource[],
): ProjectOperatingSummarySource[] {
  if (sources.length <= OPERATING_SUMMARY_SOURCE_LIMIT) {
    return sources;
  }

  const buckets = operatingSummaryCategoryOrder.map((category) => ({
    category,
    sources: sources.filter((source) => source.category === category),
  }));
  const selected: ProjectOperatingSummarySource[] = [];
  const selectedIds = new Set<string>();

  while (selected.length < OPERATING_SUMMARY_SOURCE_LIMIT) {
    const countBeforePass = selected.length;

    for (const bucket of buckets) {
      const source = bucket.sources.shift();
      if (!source || selectedIds.has(source.id)) continue;

      selected.push(source);
      selectedIds.add(source.id);

      if (selected.length >= OPERATING_SUMMARY_SOURCE_LIMIT) break;
    }

    if (selected.length === countBeforePass) break;
  }

  return selected;
}

function formatCitedItems(
  items: Array<{ title: string; sourceIds: string[] }>,
): string {
  return items
    .map((item) => `- ${item.title} [${item.sourceIds.join(", ")}]`)
    .join("\n");
}

function firstSourceDate(sources: ProjectOperatingSummarySource[]): string | null {
  return sources
    .map((source) => source.capturedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(0) ?? null;
}

function sourceById(
  sources: ProjectOperatingSummarySource[],
): Map<string, ProjectOperatingSummarySource> {
  return new Map(sources.map((source) => [source.id, source]));
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function confidenceForSummary(summary: ProjectIntelligenceSummary): "high" | "medium" | "low" {
  return summary.confidence;
}

function createSourceCoverageCard(sourceSet: ProjectOperatingSummarySourceSet) {
  const sourceIds: string[] = [];
  const seenCategories = new Set<ProjectOperatingSourceCategory>();

  for (const source of sourceSet.sources) {
    if (seenCategories.has(source.category)) continue;
    sourceIds.push(source.id);
    seenCategories.add(source.category);
  }

  if (sourceIds.length === 0) return null;

  const availableLabels = sourceSet.coverage
    .filter((row) => row.availableCount > 0)
    .map((row) => row.label);

  return {
    key: "operating-source-coverage",
    section: "source_coverage",
    rank: 7,
    title: "Available project source coverage",
    cardType: "project_update",
    summary: `Project intelligence has available source records across: ${availableLabels.join(", ") || "available source categories"}.`,
    whyItMatters: "Keeps the packet audit truthful even when the summary model does not cite every available source category.",
    nextAction: null,
    sourceIds: sourceIds.slice(0, 16),
  };
}

function createOperatingCards(
  summary: ProjectIntelligenceSummary,
  sourceSet?: ProjectOperatingSummarySourceSet,
) {
  const operating = summary.operatingSummary;
  const cards = [
    {
      key: "operating-current-read",
      section: "current_state",
      rank: 1,
      title: summary.headline,
      cardType: "project_update",
      summary: operating.currentExecutiveRead,
      whyItMatters: summary.context,
      nextAction: operating.recommendedFocus[0]?.title ?? null,
      sourceIds: summary.sourceIds.slice(0, 8),
    },
    {
      key: "operating-recent-changes",
      section: "timeline",
      rank: 2,
      title: "Recent changes and timeline",
      cardType: "change_management",
      summary: operating.recentChanges.map((item) => item.title).join(" ") || "No recent changes were explicit in the summarized sources.",
      whyItMatters: "This captures the change history the assistant should use before falling back to raw source retrieval.",
      nextAction: operating.openQuestions[0]?.title ?? null,
      sourceIds: [
        ...new Set([
          ...operating.recentChanges.flatMap((item) => item.sourceIds),
          ...operating.timeline.flatMap((item) => item.sourceIds),
        ]),
      ].slice(0, 8),
    },
    {
      key: "operating-financial-position",
      section: "financials",
      rank: 3,
      title: "Financial position and exposure",
      cardType: "financial_exposure",
      summary: operating.financialPosition.summary,
      whyItMatters: "Financial claims must stay tied to available cost, commitment, change, and Acumatica coverage.",
      nextAction: operating.financialPosition.exposure[0]?.title ?? null,
      sourceIds: [
        ...new Set([
          ...operating.financialPosition.knownAmounts.flatMap((item) => item.sourceIds),
          ...operating.financialPosition.exposure.flatMap((item) => item.sourceIds),
        ]),
      ].slice(0, 8),
    },
    {
      key: "operating-schedule-procurement",
      section: "schedule",
      rank: 4,
      title: "Schedule and procurement",
      cardType: "schedule_risk",
      summary: operating.scheduleAndProcurement.summary,
      whyItMatters: "This is the schedule/procurement read the assistant should use for project-status answers.",
      nextAction: operating.scheduleAndProcurement.blockers[0]?.title ?? null,
      sourceIds: [
        ...new Set([
          ...operating.scheduleAndProcurement.blockers.flatMap((item) => item.sourceIds),
          ...operating.scheduleAndProcurement.upcomingDates.flatMap((item) => item.sourceIds),
        ]),
      ].slice(0, 8),
    },
    {
      key: "operating-project-controls",
      section: "controls",
      rank: 5,
      title: "Project controls and tasks",
      cardType: "task",
      summary:
        [
          ...operating.projectControls.rfis,
          ...operating.projectControls.submittals,
          ...operating.projectControls.drawings,
          ...operating.projectControls.specifications,
          ...operating.projectControls.dailyReports,
          ...operating.projectControls.tasks,
        ]
          .map((item) => item.title)
          .join(" ") || "No project-control items were explicit in the summarized sources.",
      whyItMatters: "This closes the prior packet gap where available task/control records were not linked as evidence.",
      nextAction: operating.projectControls.tasks[0]?.title ?? null,
      sourceIds: [
        ...new Set([
          ...operating.projectControls.rfis.flatMap((item) => item.sourceIds),
          ...operating.projectControls.submittals.flatMap((item) => item.sourceIds),
          ...operating.projectControls.drawings.flatMap((item) => item.sourceIds),
          ...operating.projectControls.specifications.flatMap((item) => item.sourceIds),
          ...operating.projectControls.dailyReports.flatMap((item) => item.sourceIds),
          ...operating.projectControls.tasks.flatMap((item) => item.sourceIds),
        ]),
      ].slice(0, 12),
    },
    {
      key: "operating-open-questions",
      section: "next_actions",
      rank: 6,
      title: "Open questions and recommended focus",
      cardType: "open_question",
      summary:
        [
          ...operating.openQuestions.map((item) => item.title),
          ...operating.recommendedFocus.map((item) => item.title),
        ].join(" ") || "No open questions were explicit in the summarized sources.",
      whyItMatters: "The assistant should use these as the next-action baseline before inventing follow-up work.",
      nextAction: operating.recommendedFocus[0]?.title ?? null,
      sourceIds: [
        ...new Set([
          ...operating.openQuestions.flatMap((item) => item.sourceIds),
          ...operating.recommendedFocus.flatMap((item) => item.sourceIds),
        ]),
      ].slice(0, 8),
    },
  ].filter((card) => card.sourceIds.length > 0);
  const sourceCoverageCard = sourceSet ? createSourceCoverageCard(sourceSet) : null;
  return sourceCoverageCard ? [...cards, sourceCoverageCard] : cards;
}

function formatCoverage(sourceSet: ProjectOperatingSummarySourceSet): string {
  return sourceSet.coverage
    .map((category) =>
      [
        `- ${category.label}: ${category.availableCount} available`,
        `${category.sourceCount} source capsules`,
        category.latestAt ? `latest ${category.latestAt}` : "no dated source",
        category.sampleTitles.length ? `samples: ${category.sampleTitles.join("; ")}` : null,
      ]
        .filter(Boolean)
        .join(", "),
    )
    .join("\n");
}

export function formatProjectOperatingSummaryContext(input: {
  sourceSet: ProjectOperatingSummarySourceSet;
  summary?: Awaited<ReturnType<typeof summarizeProjectIntelligence>>;
  error?: string | null;
}): string {
  const { sourceSet, summary } = input;
  const unavailable = sourceSet.coverage
    .filter((category) => category.availableCount === 0)
    .map((category) => category.label);

  const lines = [
    "# Project Operating Source Coverage",
    `Project: ${sourceSet.projectName ?? sourceSet.projectId}`,
    `Generated: ${sourceSet.generatedAt}`,
    `Available source capsules: ${sourceSet.sources.length}`,
    "",
    formatCoverage(sourceSet),
  ];

  if (summary) {
    lines.push(
      "",
      "# Structured Project Operating Summary",
      `Model: ${summary.model}`,
      `Sources summarized: ${summary.sourceCount}`,
      `Headline: ${summary.headline}`,
      "",
      `Current read: ${summary.operatingSummary.currentExecutiveRead}`,
      "",
      "Timeline:",
      formatCitedItems(summary.operatingSummary.timeline),
      "",
      "Recent changes:",
      formatCitedItems(summary.operatingSummary.recentChanges),
      "",
      `Financial position: ${summary.operatingSummary.financialPosition.summary}`,
      formatCitedItems([
        ...summary.operatingSummary.financialPosition.knownAmounts,
        ...summary.operatingSummary.financialPosition.exposure,
      ]),
      "",
      `Schedule and procurement: ${summary.operatingSummary.scheduleAndProcurement.summary}`,
      formatCitedItems([
        ...summary.operatingSummary.scheduleAndProcurement.blockers,
        ...summary.operatingSummary.scheduleAndProcurement.upcomingDates,
      ]),
      "",
      "Project controls:",
      [
        ...formatCitedItems(summary.operatingSummary.projectControls.rfis).split("\n"),
        ...formatCitedItems(summary.operatingSummary.projectControls.submittals).split("\n"),
        ...formatCitedItems(summary.operatingSummary.projectControls.drawings).split("\n"),
        ...formatCitedItems(summary.operatingSummary.projectControls.specifications).split("\n"),
        ...formatCitedItems(summary.operatingSummary.projectControls.dailyReports).split("\n"),
        ...formatCitedItems(summary.operatingSummary.projectControls.tasks).split("\n"),
      ]
        .filter((line) => line.trim().length > 0)
        .join("\n") || "- No project-control items were explicit in the selected sources.",
      "",
      "Open questions:",
      formatCitedItems(summary.operatingSummary.openQuestions),
      "",
      "Recommended focus:",
      formatCitedItems(summary.operatingSummary.recommendedFocus),
      "",
      `Confidence: ${summary.confidence}`,
      `Data gaps: ${summary.dataGaps.join("; ") || "None listed."}`,
    );
  } else {
    lines.push(
      "",
      "# Structured Project Operating Summary",
      input.error
        ? `Summary generation failed loudly: ${input.error}`
        : "Summary generation was not available for this request.",
    );
  }

  lines.push(
    "",
    `Unavailable source categories: ${unavailable.join(", ") || "None"}`,
    "If an available category has zero packet evidence, treat the old card packet as incomplete and use this operating coverage as the fresher source map.",
  );

  return lines.join("\n");
}

export async function buildProjectOperatingSummarySources({
  projectId,
  supabase,
}: {
  projectId: number;
  supabase: AlleatoSupabaseClient;
}): Promise<ProjectOperatingSummarySourceSet> {
  const docSelectColumns = "id,title,type,category,source,source_system,date,captured_at,summary,overview,notes,action_items,decisions,key_topics,topics_discussed,source_web_url,url";

  const [
    projectRes,
    meetingsRes,
    emailsRes,
    teamsRes,
    otherDocsRes,
    rfiRes,
    submittalRes,
    drawingRes,
    specRes,
    dailyLogRes,
    taskRes,
    scheduleTaskRes,
    directCostRes,
    commitmentRes,
    apBillRes,
    acumaticaChangeOrderRes,
    acumaticaSubcontractRes,
    acumaticaPurchaseOrderRes,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,project_number,phase,current_phase,client,summary,summary_updated_at,created_at,health_status,completion_percentage,budget,budget_used,erp_system,erp_sync_status,erp_last_job_cost_sync,erp_last_direct_cost_sync,acumatica_project_id,work_scope,project_sector,delivery_method")
      .eq("id", projectId)
      .single(),
    supabase
      .from("document_metadata")
      .select(docSelectColumns)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .eq("type", "meeting")
      .order("date", { ascending: false, nullsFirst: false })
      .limit(SOURCE_LIMITS.meetings),
    supabase
      .from("document_metadata")
      .select(docSelectColumns)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .eq("category", "email")
      .order("date", { ascending: false, nullsFirst: false })
      .limit(SOURCE_LIMITS.emails),
    supabase
      .from("document_metadata")
      .select(docSelectColumns)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .eq("category", "teams_message")
      .order("date", { ascending: false, nullsFirst: false })
      .limit(SOURCE_LIMITS.teams),
    supabase
      .from("document_metadata")
      .select(docSelectColumns)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .not("type", "in", "(meeting,email)")
      .not("category", "in", "(email,teams_message)")
      .order("date", { ascending: false, nullsFirst: false })
      .limit(SOURCE_LIMITS.documents),
    supabase
      .from("rfis")
      .select("id,number,subject,status,question,due_date,ball_in_court,cost_impact,schedule_impact,drawing_number,specification,updated_at,created_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_LIMITS.rfis),
    supabase
      .from("submittals")
      .select("id,submittal_number,title,status,description,final_due_date,required_approval_date,required_on_site_date,ball_in_court,lead_time,priority,specification_section,updated_at,created_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(SOURCE_LIMITS.submittals),
    supabase
      .from("drawings")
      .select("id,drawing_number,title,discipline,drawing_type,is_published,is_obsolete,updated_at,created_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_LIMITS.drawings),
    supabase
      .from("specifications")
      .select("id,section_number,section_title,specification_type,status,ai_summary,content,requirements,updated_at,created_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(SOURCE_LIMITS.specifications),
    supabase
      .from("daily_logs")
      .select("id,log_date,weather_conditions,created_at,updated_at")
      .eq("project_id", projectId)
      .order("log_date", { ascending: false })
      .limit(SOURCE_LIMITS.dailyLogs),
    supabase
      .from("tasks")
      .select("id,title,description,status,priority,due_date,assignee_name,source_system,metadata_id,created_at,updated_at")
      .or(`project_id.eq.${projectId},project_ids.cs.{${projectId}}`)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_LIMITS.tasks),
    supabase
      .from("schedule_tasks")
      .select("id,name,status,start_date,finish_date,percent_complete,is_milestone,constraint_date,constraint_type,priority,assignee,updated_at,created_at")
      .eq("project_id", projectId)
      .order("finish_date", { ascending: true, nullsFirst: false })
      .limit(SOURCE_LIMITS.scheduleTasks),
    supabase
      .from("direct_costs")
      .select("id,date,description,status,total_amount,cost_type,invoice_number,acumatica_ref_nbr,acumatica_doc_type,acumatica_sync_at,updated_at")
      .eq("project_id", projectId)
      .is("is_deleted", false)
      .order("date", { ascending: false })
      .limit(SOURCE_LIMITS.financialRows),
    supabase
      .from("commitments_unified")
      .select("id,title,commitment_type,contract_number,status,executed,contract_date,issued_on_date,updated_at")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(SOURCE_LIMITS.financialRows),
    supabase
      .from("acumatica_ap_bills")
      .select("id,reference_nbr,document_type,status,amount,balance,date,due_date,description,project_code,acumatica_sync_at,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_LIMITS.financialRows),
    supabase
      .from("acumatica_change_orders")
      .select("id,reference_nbr,status,description,revenue_budget_change_total,cost_budget_change_total,commitments_change_total,change_date,project_code,acumatica_sync_at,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_LIMITS.financialRows),
    supabase
      .from("acumatica_subcontracts")
      .select("id,subcontract_nbr,status,description,subcontract_total,line_total,date,project_code,acumatica_sync_at,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_LIMITS.financialRows),
    supabase
      .from("acumatica_purchase_orders")
      .select("id,order_nbr,order_type,status,description,order_total,line_total,date,promised_on,project_code,acumatica_sync_at,updated_at")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(SOURCE_LIMITS.financialRows),
  ]);

  if (projectRes.error || !projectRes.data) {
    throw new Error(`Failed to load project ${projectId} for operating summary sources: ${projectRes.error?.message ?? "not found"}`);
  }

  const docsById = new Map<string, NonNullable<typeof meetingsRes.data>[number]>();
  for (const bucket of [meetingsRes.data, emailsRes.data, teamsRes.data, otherDocsRes.data]) {
    for (const row of bucket ?? []) {
      docsById.set(row.id, row);
    }
  }
  const docsData = Array.from(docsById.values());

  const project = projectRes.data;
  const projectName = project.name;
  const sources: ProjectOperatingSummarySource[] = [
    makeSource({
      category: "project_detail",
      id: `project:${project.id}`,
      recordId: String(project.id),
      title: project.name,
      projectName,
      capturedAt: project.erp_last_job_cost_sync ?? project.erp_last_direct_cost_sync ?? project.summary_updated_at ?? project.created_at,
      text: joinFields([
        ["Project", project.name],
        ["Project number", project.project_number],
        ["Phase", project.current_phase ?? project.phase],
        ["Client", project.client],
        ["Summary", project.summary],
        ["Health", project.health_status],
        ["Completion percent", project.completion_percentage],
        ["Budget", project.budget],
        ["Budget used", project.budget_used],
        ["ERP", project.erp_system],
        ["ERP sync status", project.erp_sync_status],
        ["Last job cost sync", project.erp_last_job_cost_sync],
        ["Last direct cost sync", project.erp_last_direct_cost_sync],
        ["Acumatica project id", project.acumatica_project_id],
        ["Work scope", project.work_scope],
        ["Sector", project.project_sector],
        ["Delivery method", project.delivery_method],
      ]),
    }),
  ];

  docsData.forEach((row) => {
    const category = normalizeDocumentCategory(row as Record<string, unknown>);
    sources.push(
      makeSource({
        category,
        id: `document_metadata:${row.id}`,
        recordId: row.id,
        title: row.title,
        projectName,
        capturedAt: safeDate(row.date, row.captured_at),
        sourceUrl: row.source_web_url ?? row.url,
        href: `/${projectId}/intelligence/sources/${encodeURIComponent(row.id)}`,
        text: joinFields([
          ["Title", row.title],
          ["Type", row.type],
          ["Category", row.category],
          ["Source", row.source_system ?? row.source],
          ["Date", row.date ?? row.captured_at],
          ["Summary", row.summary ?? row.overview],
          ["Notes", row.notes],
          ["Action items", row.action_items],
          ["Decisions", row.decisions],
          ["Key topics", row.key_topics ?? row.topics_discussed],
        ]),
      }),
    );
  });

  (rfiRes.data ?? []).forEach((row) => {
    sources.push(
      makeSource({
        category: "rfi",
        id: `rfi:${row.id}`,
        recordId: row.id,
        title: `RFI ${row.number}: ${row.subject}`,
        projectName,
        capturedAt: row.updated_at ?? row.created_at,
        href: `/${projectId}/rfis/${row.id}`,
        text: joinFields([
          ["RFI", row.number],
          ["Subject", row.subject],
          ["Status", row.status],
          ["Question", row.question],
          ["Due date", row.due_date],
          ["Ball in court", row.ball_in_court],
          ["Cost impact", row.cost_impact],
          ["Schedule impact", row.schedule_impact],
          ["Drawing", row.drawing_number],
          ["Specification", row.specification],
        ]),
      }),
    );
  });

  (submittalRes.data ?? []).forEach((row) => {
    sources.push(
      makeSource({
        category: "submittal",
        id: `submittal:${row.id}`,
        recordId: row.id,
        title: `${row.submittal_number}: ${row.title}`,
        projectName,
        capturedAt: row.updated_at ?? row.created_at,
        href: `/${projectId}/submittals/${row.id}`,
        text: joinFields([
          ["Submittal", row.submittal_number],
          ["Title", row.title],
          ["Status", row.status],
          ["Description", row.description],
          ["Priority", row.priority],
          ["Final due date", row.final_due_date],
          ["Required approval date", row.required_approval_date],
          ["Required on site date", row.required_on_site_date],
          ["Ball in court", row.ball_in_court],
          ["Lead time", row.lead_time],
          ["Specification section", row.specification_section],
        ]),
      }),
    );
  });

  (drawingRes.data ?? []).forEach((row) => {
    sources.push(
      makeSource({
        category: "drawing",
        id: `drawing:${row.id}`,
        recordId: row.id,
        title: `${row.drawing_number}: ${row.title}`,
        projectName,
        capturedAt: row.updated_at ?? row.created_at,
        href: `/${projectId}/drawings/${row.id}`,
        text: joinFields([
          ["Drawing", row.drawing_number],
          ["Title", row.title],
          ["Discipline", row.discipline],
          ["Type", row.drawing_type],
          ["Published", row.is_published],
          ["Obsolete", row.is_obsolete],
        ]),
      }),
    );
  });

  (specRes.data ?? []).forEach((row) => {
    sources.push(
      makeSource({
        category: "specification",
        id: `specification:${row.id}`,
        recordId: row.id,
        title: `${row.section_number}: ${row.section_title}`,
        projectName,
        capturedAt: row.updated_at ?? row.created_at,
        href: `/${projectId}/specifications`,
        text: joinFields([
          ["Section", row.section_number],
          ["Title", row.section_title],
          ["Type", row.specification_type],
          ["Status", row.status],
          ["AI summary", row.ai_summary],
          ["Requirements", row.requirements],
          ["Content", row.content?.slice(0, 1200)],
        ]),
      }),
    );
  });

  (dailyLogRes.data ?? []).forEach((row) => {
    sources.push(
      makeSource({
        category: "daily_report",
        id: `daily_log:${row.id}`,
        recordId: row.id,
        title: `Daily report ${row.log_date}`,
        projectName,
        capturedAt: row.log_date ?? row.updated_at ?? row.created_at,
        href: `/${projectId}/daily-log`,
        text: joinFields([
          ["Log date", row.log_date],
          ["Weather", row.weather_conditions],
          ["Updated", row.updated_at],
        ]),
      }),
    );
  });

  (taskRes.data ?? []).forEach((row) => {
    sources.push(
      makeSource({
        category: row.priority === "critical" ? "risk" : "task",
        id: `task:${row.id}`,
        recordId: row.id,
        title: row.title,
        projectName,
        capturedAt: row.updated_at ?? row.created_at,
        href: `/${projectId}/tasks`,
        text: joinFields([
          ["Task", row.title],
          ["Description", row.description],
          ["Status", row.status],
          ["Priority", row.priority],
          ["Due date", row.due_date],
          ["Assignee", row.assignee_name],
          ["Source", row.source_system],
        ]),
      }),
    );
  });

  (scheduleTaskRes.data ?? []).forEach((row) => {
    sources.push(
      makeSource({
        category: "task",
        id: `schedule_task:${row.id}`,
        recordId: row.id,
        title: row.name,
        projectName,
        capturedAt: row.updated_at ?? row.finish_date ?? row.created_at,
        href: `/${projectId}/schedule`,
        text: joinFields([
          ["Schedule task", row.name],
          ["Status", row.status],
          ["Start", row.start_date],
          ["Finish", row.finish_date],
          ["Percent complete", row.percent_complete],
          ["Milestone", row.is_milestone],
          ["Constraint", row.constraint_type],
          ["Constraint date", row.constraint_date],
          ["Priority", row.priority],
          ["Assignee", row.assignee],
        ]),
      }),
    );
  });

  const financialRows = [
    ...(directCostRes.data ?? []).map((row) => ({
      id: `direct_cost:${row.id}`,
      recordId: row.id,
      title: row.description ?? row.invoice_number ?? row.acumatica_ref_nbr ?? "Direct cost",
      capturedAt: row.acumatica_sync_at ?? row.updated_at ?? row.date,
      text: joinFields([
        ["Direct cost", row.description],
        ["Status", row.status],
        ["Amount", row.total_amount],
        ["Cost type", row.cost_type],
        ["Invoice", row.invoice_number],
        ["Acumatica ref", row.acumatica_ref_nbr],
        ["Sync", row.acumatica_sync_at],
      ]),
    })),
    ...(commitmentRes.data ?? []).map((row) => ({
      id: `commitment:${row.id ?? row.contract_number}`,
      recordId: String(row.id ?? row.contract_number ?? "unknown"),
      title: row.title ?? row.contract_number ?? "Commitment",
      capturedAt: row.updated_at ?? row.contract_date ?? row.issued_on_date,
      text: joinFields([
        ["Commitment", row.title],
        ["Type", row.commitment_type],
        ["Number", row.contract_number],
        ["Status", row.status],
        ["Executed", row.executed],
        ["Contract date", row.contract_date],
        ["Issued", row.issued_on_date],
      ]),
    })),
    ...(apBillRes.data ?? []).map((row) => ({
      id: `acumatica_ap_bill:${row.id}`,
      recordId: String(row.id),
      title: row.reference_nbr,
      capturedAt: row.acumatica_sync_at ?? row.updated_at ?? row.date,
      text: joinFields([
        ["AP bill", row.reference_nbr],
        ["Status", row.status],
        ["Amount", row.amount],
        ["Balance", row.balance],
        ["Date", row.date],
        ["Due date", row.due_date],
        ["Description", row.description],
        ["Project code", row.project_code],
      ]),
    })),
    ...(acumaticaChangeOrderRes.data ?? []).map((row) => ({
      id: `acumatica_change_order:${row.id}`,
      recordId: String(row.id),
      title: row.reference_nbr,
      capturedAt: row.acumatica_sync_at ?? row.updated_at ?? row.change_date,
      text: joinFields([
        ["Acumatica change order", row.reference_nbr],
        ["Status", row.status],
        ["Description", row.description],
        ["Revenue budget change", row.revenue_budget_change_total],
        ["Cost budget change", row.cost_budget_change_total],
        ["Commitments change", row.commitments_change_total],
        ["Change date", row.change_date],
        ["Project code", row.project_code],
      ]),
    })),
    ...(acumaticaSubcontractRes.data ?? []).map((row) => ({
      id: `acumatica_subcontract:${row.id}`,
      recordId: String(row.id),
      title: row.subcontract_nbr,
      capturedAt: row.acumatica_sync_at ?? row.updated_at ?? row.date,
      text: joinFields([
        ["Acumatica subcontract", row.subcontract_nbr],
        ["Status", row.status],
        ["Description", row.description],
        ["Subcontract total", row.subcontract_total],
        ["Line total", row.line_total],
        ["Date", row.date],
        ["Project code", row.project_code],
      ]),
    })),
    ...(acumaticaPurchaseOrderRes.data ?? []).map((row) => ({
      id: `acumatica_purchase_order:${row.id}`,
      recordId: String(row.id),
      title: row.order_nbr,
      capturedAt: row.acumatica_sync_at ?? row.updated_at ?? row.date,
      text: joinFields([
        ["Acumatica purchase order", row.order_nbr],
        ["Type", row.order_type],
        ["Status", row.status],
        ["Description", row.description],
        ["Order total", row.order_total],
        ["Line total", row.line_total],
        ["Promised on", row.promised_on],
        ["Project code", row.project_code],
      ]),
    })),
  ];

  financialRows.slice(0, SOURCE_LIMITS.financialRows).forEach((row) => {
    sources.push(
      makeSource({
        category: "acumatica",
        id: row.id,
        recordId: row.recordId,
        title: row.title,
        projectName,
        capturedAt: row.capturedAt,
        href: `/${projectId}/direct-costs`,
        text: row.text,
      }),
    );
  });

  const [
    meetingCountRes,
    emailCountRes,
    teamsCountRes,
    documentCountRes,
  ] = await Promise.all([
    supabase
      .from("document_metadata")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .eq("type", "meeting"),
    supabase
      .from("document_metadata")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .eq("category", "email"),
    supabase
      .from("document_metadata")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .eq("category", "teams_message"),
    supabase
      .from("document_metadata")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .not("type", "in", "(meeting,email)")
      .not("category", "in", "(email,teams_message)"),
  ]);

  const availableCounts: Partial<Record<ProjectOperatingSourceCategory, number>> = {
    project_detail: project ? 1 : 0,
    meeting: countResult(meetingCountRes) ?? docsData.filter((row) => normalizeDocumentCategory(row as Record<string, unknown>) === "meeting").length,
    email: countResult(emailCountRes) ?? docsData.filter((row) => normalizeDocumentCategory(row as Record<string, unknown>) === "email").length,
    teams: countResult(teamsCountRes) ?? docsData.filter((row) => normalizeDocumentCategory(row as Record<string, unknown>) === "teams").length,
    document: countResult(documentCountRes) ?? docsData.filter((row) => normalizeDocumentCategory(row as Record<string, unknown>) === "document").length,
    rfi: countRows(rfiRes.data),
    submittal: countRows(submittalRes.data),
    drawing: countRows(drawingRes.data),
    specification: countRows(specRes.data),
    daily_report: countRows(dailyLogRes.data),
    task: countRows(taskRes.data) + countRows(scheduleTaskRes.data),
    acumatica: countRows(directCostRes.data) +
      countRows(commitmentRes.data) +
      countRows(apBillRes.data) +
      countRows(acumaticaChangeOrderRes.data) +
      countRows(acumaticaSubcontractRes.data) +
      countRows(acumaticaPurchaseOrderRes.data),
  };

  const coverage = buildCoverage(sources, availableCounts);

  return {
    projectId,
    projectName,
    generatedAt: new Date().toISOString(),
    sources,
    coverage,
    missingCategories: coverage.filter((category) => category.availableCount === 0),
  };
}

export async function summarizeProjectOperatingIntelligence(input: {
  projectId: number;
  supabase: AlleatoSupabaseClient;
  model?: string;
}) {
  const sourceSet = await buildProjectOperatingSummarySources(input);
  const selectedSources = selectOperatingSummarySources(sourceSet.sources);
  const summary = await summarizeProjectIntelligence({
    focus: "project_operating_summary",
    projectName: sourceSet.projectName,
    model: input.model,
    sources: selectedSources,
  });

  return {
    sourceSet,
    selectedSources,
    summary,
  };
}

export async function refreshProjectOperatingIntelligencePacket(input: {
  targetId: string;
  projectId: number;
  supabase: AlleatoSupabaseClient;
  model?: string;
}) {
  const { sourceSet, selectedSources, summary } = await summarizeProjectOperatingIntelligence(input);
  const sources = sourceById(sourceSet.sources);
  const cards = createOperatingCards(summary, sourceSet);
  const generatedAt = new Date().toISOString();
  const latestAt = latestDate(sourceSet.sources);
  const earliestAt = firstSourceDate(sourceSet.sources);
  const unavailableCategories = sourceSet.coverage
    .filter((category) => category.availableCount === 0)
    .map((category) => category.label);
  const availableButNotSelectedCategories = sourceSet.coverage
    .filter((category) => category.availableCount > 0 && category.sourceCount === 0)
    .map((category) => category.label);

  const sourceCoverage: Json = {
    freshnessStatus: "fresh",
    operatingSummaryGeneratedAt: generatedAt,
    operatingSummarySourceCount: sourceSet.sources.length,
    operatingSummarySelectedSourceCount: selectedSources.length,
    operatingSummaryCoveredTypes: summary.operatingSummary.sourceCoverage.coveredTypes,
    operatingSummaryMissingTypes: summary.operatingSummary.sourceCoverage.missingTypes,
    operatingSummaryWeakestAreas: summary.operatingSummary.sourceCoverage.weakestAreas,
    categoryCoverage: sourceSet.coverage,
    latestSourceAt: latestAt,
    linkedEvidenceCount: cards.reduce((total, card) => total + card.sourceIds.length, 0),
    gaps: [
      ...summary.dataGaps,
      ...unavailableCategories.map((label) => `${label} has no available source data for this project.`),
      ...availableButNotSelectedCategories.map((label) => `${label} had available rows but no selected source capsule.`),
    ],
  };

  const packetJson: Json = {
    schema: "project_operating_packet_v1",
    target: {
      id: input.targetId,
      projectId: input.projectId,
      name: sourceSet.projectName,
    },
    generatedAt,
    sourceSet: {
      projectId: sourceSet.projectId,
      projectName: sourceSet.projectName,
      generatedAt: sourceSet.generatedAt,
      coverage: sourceSet.coverage,
      sourceIds: sourceSet.sources.map((source) => source.id),
      selectedSourceIds: selectedSources.map((source) => source.id),
    },
    summary,
  };

  const confidenceSummary: Json = {
    overall: confidenceForSummary(summary),
    status: confidenceForSummary(summary),
    financialExposure: summary.operatingSummary.financialPosition.exposure.length > 0 ? confidenceForSummary(summary) : "low",
    changeManagement: summary.operatingSummary.recentChanges.length > 0 ? confidenceForSummary(summary) : "low",
    followUps: summary.operatingSummary.recommendedFocus.length > 0 ? confidenceForSummary(summary) : "low",
    reason: summary.dataGaps.length
      ? `Structured operating summary generated from ${summary.sourceCount} source capsules; gaps: ${summary.dataGaps.join("; ")}`
      : `Structured operating summary generated from ${summary.sourceCount} source capsules.`,
  };

  const packetPayload = {
    target_id: input.targetId,
    packet_type: "current",
    packet_version: "project_operating_summary_v1",
    generated_at: generatedAt,
    covered_start_at: earliestAt,
    covered_end_at: latestAt,
    freshness_status: "fresh",
    executive_summary: summary.headline,
    current_status: summary.operatingSummary.currentExecutiveRead,
    strategic_read: summary.context,
    why_it_matters: summary.operatingSummary.recommendedFocus.map((item) => item.title).join(" ") || summary.context,
    recommended_next_moves: summary.actionItems.map((item) => item.title).slice(0, 8),
    confidence_summary: confidenceSummary,
    source_coverage: sourceCoverage,
    review_queue_count: summary.dataGaps.length,
    stale_item_count: 0,
    packet_json: packetJson,
    compiler_version: OPERATING_PACKET_COMPILER_VERSION,
  };

  const { data: existingPacket, error: existingPacketError } = await input.supabase
    .from("intelligence_packets")
    .select("id")
    .eq("target_id", input.targetId)
    .eq("packet_type", "current")
    .maybeSingle();

  if (existingPacketError) {
    throw new Error(`Failed to load current intelligence packet for refresh: ${existingPacketError.message}`);
  }

  const { data: packet, error: packetError } = existingPacket
    ? await input.supabase
      .from("intelligence_packets")
      .update(packetPayload)
      .eq("id", existingPacket.id)
      .select("id")
      .single()
    : await input.supabase
    .from("intelligence_packets")
    .insert(packetPayload)
    .select("id")
    .single();

  if (packetError || !packet) {
    throw new Error(`Failed to persist operating intelligence packet: ${packetError?.message ?? "no packet returned"}`);
  }

  const insertedCards: Array<{ id: string; section: string; rank: number; sourceIds: string[] }> = [];

  for (const card of cards) {
    const cardSources = card.sourceIds
      .map((sourceId) => sources.get(sourceId))
      .filter((source): source is ProjectOperatingSummarySource => Boolean(source));
    const firstSource = cardSources[0];
    const { data: insertedCard, error: cardError } = await input.supabase
      .from("insight_cards")
      .insert({
        primary_target_id: input.targetId,
        title: truncate(card.title, 180),
        card_type: card.cardType,
        summary: truncate(card.summary, 1600),
        why_it_matters: truncate(card.whyItMatters, 1000),
        current_status: "open",
        confidence: confidenceForSummary(summary),
        attribution_status: confidenceForSummary(summary) === "low" ? "needs_review" : "approved",
        next_action: card.nextAction ? truncate(card.nextAction, 600) : null,
        first_seen_at: firstSource?.capturedAt ?? generatedAt,
        last_seen_at: latestDate(cardSources) ?? generatedAt,
        stale_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        source_count: cardSources.length,
        compiler_version: OPERATING_PACKET_COMPILER_VERSION,
        metadata: {
          key: card.key,
          sourceIds: card.sourceIds,
          generatedFrom: "project_operating_summary",
          operatingSummaryGeneratedAt: generatedAt,
        } satisfies Json,
      })
      .select("id")
      .single();

    if (cardError || !insertedCard) {
      throw new Error(`Failed to persist operating insight card "${card.key}": ${cardError?.message ?? "no card returned"}`);
    }

    insertedCards.push({
      id: insertedCard.id,
      section: card.section,
      rank: card.rank,
      sourceIds: card.sourceIds,
    });

    const { error: targetError } = await input.supabase.from("insight_card_targets").insert({
      insight_card_id: insertedCard.id,
      target_id: input.targetId,
      relationship: "primary",
      confidence: confidenceForSummary(summary),
      attribution_status: confidenceForSummary(summary) === "low" ? "needs_review" : "approved",
      matched_terms: [sourceSet.projectName ?? `project ${input.projectId}`],
      reason: "Generated from structured project operating summary refresh.",
    });

    if (targetError) {
      throw new Error(`Failed to persist operating insight card target: ${targetError.message}`);
    }

    const evidenceRows = cardSources.map((source) => ({
      insight_card_id: insertedCard.id,
      source_document_id: ["meeting", "email", "teams", "document"].includes(source.category)
        ? source.recordId
        : null,
      source_message_id: source.id,
      source_type: source.type,
      source_title: source.title ?? source.recordId,
      source_occurred_at: source.capturedAt,
      participants: [],
      excerpt: truncate(source.text, 700),
      summary: truncate(card.summary, 700),
      relevance_reason: `Supports ${card.title}.`,
      evidence_role: "operating_summary_source",
      confidence: confidenceForSummary(summary),
    }));

    if (evidenceRows.length > 0) {
      const { error: evidenceError } = await input.supabase
        .from("insight_card_evidence")
        .insert(evidenceRows);

      if (evidenceError) {
        throw new Error(`Failed to persist operating insight evidence: ${evidenceError.message}`);
      }
    }
  }

  if (insertedCards.length > 0) {
    const { error: deletePacketCardsError } = await input.supabase
      .from("intelligence_packet_cards")
      .delete()
      .eq("packet_id", packet.id);

    if (deletePacketCardsError) {
      throw new Error(`Failed to replace current packet card links: ${deletePacketCardsError.message}`);
    }

    const { error: packetCardsError } = await input.supabase
      .from("intelligence_packet_cards")
      .insert(
        insertedCards.map((card) => ({
          packet_id: packet.id,
          insight_card_id: card.id,
          section: card.section,
          rank: card.rank,
          included_reason: "Generated from structured project operating summary refresh.",
        })),
      );

    if (packetCardsError) {
      throw new Error(`Failed to persist operating packet card links: ${packetCardsError.message}`);
    }
  }

  return {
    packetId: packet.id,
    cardCount: insertedCards.length,
    linkedEvidenceCount: insertedCards.reduce((total, card) => total + card.sourceIds.length, 0),
    sourceSet,
    selectedSources,
    summary,
  };
}
