import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { Database } from "@/types/database.types";

type AIInsight = Database["public"]["Tables"]["ai_insights"]["Row"];

const config: GenericTableConfig = {
  title: "AI Insights",
  description: "AI-generated insights from meetings and documents",
  searchFields: ["title", "description", "business_impact", "assignee"],
  exportFilename: "ai-insights-export.csv",
  editConfig: {
    tableName: "ai_insights",
    editableFields: [
      "title",
      "description",
      "insight_type",
      "category",
      "priority",
      "status",
      "business_impact",
      "recommended_action",
      "assignee",
      "due_date",
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
      id: "insight_type",
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
          in_progress: "default",
          resolved: "outline",
          closed: "outline",
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
      id: "assignee",
      label: "Assignee",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "confidence_score",
      label: "Confidence",
      defaultVisible: true,
      type: "number",
    },
    {
      id: "financial_impact",
      label: "Financial Impact",
      defaultVisible: true,
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "timeline_impact_days",
      label: "Timeline Impact (days)",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "business_impact",
      label: "Business Impact",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "meeting_name",
      label: "Meeting",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "meeting_date",
      label: "Meeting Date",
      defaultVisible: false,
      type: "date",
    },
    {
      id: "project_name",
      label: "Project",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "due_date",
      label: "Due Date",
      defaultVisible: false,
      type: "date",
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
      id: "resolved_at",
      label: "Resolved At",
      defaultVisible: false,
      type: "date",
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
      id: "insight_type",
      label: "Type",
      field: "insight_type",
      options: [
        { value: "risk", label: "Risk" },
        { value: "opportunity", label: "Opportunity" },
        { value: "decision", label: "Decision" },
        { value: "action_item", label: "Action Item" },
        { value: "issue", label: "Issue" },
      ],
    },
    {
      id: "status",
      label: "Status",
      field: "status",
      options: [
        { value: "open", label: "Open" },
        { value: "in_progress", label: "In Progress" },
        { value: "resolved", label: "Resolved" },
        { value: "closed", label: "Closed" },
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

  const { data: aiInsights, error } = await supabase
    .from("ai_insights")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading AI insights. Please try again later.
      </div>
    );
  }

  return <GenericDataTable data={aiInsights || []} config={config} />;
}
