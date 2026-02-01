import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";

const PAGE_TITLE = "Issues";
const PAGE_DESCRIPTION = "Track and manage project issues";

const config: GenericTableConfig = {
  searchFields: ["title", "description", "reported_by", "notes"],
  exportFilename: "issues-export.csv",
  editConfig: {
    tableName: "issues",
    editableFields: [
      "title",
      "category",
      "severity",
      "status",
      "reported_by",
      "date_reported",
      "date_resolved",
      "total_cost",
      "direct_cost",
      "indirect_cost",
      "description",
      "notes",
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
      id: "category",
      label: "Category",
      defaultVisible: true,
      type: "badge",
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
      id: "reported_by",
      label: "Reported By",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "date_reported",
      label: "Date Reported",
      defaultVisible: true,
      type: "date",
    },
    {
      id: "date_resolved",
      label: "Date Resolved",
      defaultVisible: false,
      type: "date",
    },
    {
      id: "total_cost",
      label: "Total Cost",
      defaultVisible: true,
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "direct_cost",
      label: "Direct Cost",
      defaultVisible: false,
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "indirect_cost",
      label: "Indirect Cost",
      defaultVisible: false,
      renderConfig: {
        type: "currency",
        prefix: "$",
      },
    },
    {
      id: "description",
      label: "Description",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "notes",
      label: "Notes",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "created_at",
      label: "Created",
      defaultVisible: false,
      type: "date",
    },
  ],
  filters: [
    {
      id: "category",
      label: "Category",
      field: "category",
      options: [
        { value: "safety", label: "Safety" },
        { value: "quality", label: "Quality" },
        { value: "schedule", label: "Schedule" },
        { value: "cost", label: "Cost" },
        { value: "technical", label: "Technical" },
        { value: "other", label: "Other" },
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
  ],
  rowClickPath: "/issues/{id}",
};

export default async function IssuesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading data. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  return (
    <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <GenericDataTable data={data || []} config={config} />
    </TablePageWrapper>
  );
}
