import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";
import {
  insightCardBaseQuery,
  deriveSeverity,
  type InsightCardWithTarget,
} from "@/lib/ai/insight-cards";

const PAGE_TITLE = "AI Insights";
const PAGE_DESCRIPTION = "AI-generated insights from meetings and documents";

const config: GenericTableConfig = {
  title: "AI Insights",
  hideHeader: true,
  description: "AI-generated insights from meetings and documents",
  searchFields: ["title", "description", "project_name", "owner"],
  exportFilename: "ai-insights-export.csv",
  editConfig: {
    tableName: "insight_cards",
    editableFields: [
      "title",
      "summary",
      "why_it_matters",
      "card_type",
      "current_status",
      "next_action",
      "suggested_owner_label",
    ],
  },
  columns: [
    {
      id: "title",
      label: "Title",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "description",
      label: "Description",
      defaultVisible: true,
      renderConfig: {
        type: "truncate",
        maxLength: 100,
      },
    },
    {
      id: "type",
      label: "Type",
      defaultVisible: true,
      type: "badge",
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          open: "destructive",
          blocked: "destructive",
          needs_review: "default",
          stale: "outline",
          resolved: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "severity",
      label: "Severity",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          critical: "destructive",
          high: "destructive",
          medium: "default",
          low: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "owner",
      label: "Owner",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "confidence",
      label: "Confidence",
      defaultVisible: true,
      type: "badge",
    },
    {
      id: "project_name",
      label: "Project",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "next_action",
      label: "Next Action",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "why_it_matters",
      label: "Why It Matters",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "resolved",
      label: "Resolved",
      defaultVisible: false,
      renderConfig: {
        type: "badge",
        variantMap: {
          true: "default",
          false: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "created_at",
      label: "Created",
      defaultVisible: true,
      type: "date",
    },
  ],
  filters: [
    {
      id: "type",
      label: "Type",
      field: "type",
      options: [
        { value: "risk", label: "Risk" },
        { value: "blocker", label: "Blocker" },
        { value: "financial_exposure", label: "Financial Exposure" },
        { value: "schedule_risk", label: "Schedule Risk" },
        { value: "decision", label: "Decision" },
        { value: "change_management", label: "Change Management" },
        { value: "task", label: "Task" },
        { value: "open_question", label: "Open Question" },
        { value: "requirement", label: "Requirement" },
        { value: "process_issue", label: "Process Issue" },
        { value: "product_need", label: "Product Need" },
        { value: "project_update", label: "Project Update" },
      ],
    },
    {
      id: "status",
      label: "Status",
      field: "status",
      options: [
        { value: "open", label: "Open" },
        { value: "blocked", label: "Blocked" },
        { value: "needs_review", label: "Needs Review" },
        { value: "stale", label: "Stale" },
        { value: "resolved", label: "Resolved" },
      ],
    },
    {
      id: "severity",
      label: "Severity",
      field: "severity",
      options: [
        { value: "critical", label: "Critical" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
  ],
  rowClickPath: "/insights/{id}",
};

export default async function AIInsightsPage() {
  const supabase = await createClient();

  const { data: rawCards, error } = await insightCardBaseQuery(supabase, {
    includeAnyStatus: true,
  }).order("created_at", { ascending: false });

  if (error) {
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading AI insights. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  const cards = (rawCards ?? []) as unknown as InsightCardWithTarget[];

  // Map insight_cards rows to the flat row shape the table expects.
  const rows = cards.map((card) => ({
    id: card.id,
    title: card.title,
    description: card.summary,
    type: card.card_type,
    status: card.current_status,
    severity: deriveSeverity(card),
    confidence: card.confidence,
    owner: card.suggested_owner_label ?? "",
    project_name: card.intelligence_targets?.name ?? "",
    next_action: card.next_action ?? "",
    why_it_matters: card.why_it_matters ?? "",
    resolved: card.current_status === "resolved",
    created_at: card.created_at,
  }));

  return (
    <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <GenericDataTable data={rows} config={config} />
    </TablePageWrapper>
  );
}
