import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";

const PAGE_TITLE = "Tasks";
const PAGE_DESCRIPTION = "Manage and track your project tasks";

const config: GenericTableConfig = {
  searchFields: ["description", "assignee_name", "assignee_email"],
  exportFilename: "tasks-export.csv",
  editConfig: {
    tableName: "tasks",
    editableFields: [
      "description",
      "assignee_name",
      "assignee_email",
      "status",
      "due_date",
      "priority",
      "project_id",
    ],
  },
  columns: [
    {
      id: "description",
      label: "Task Description",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          open: "secondary",
          in_progress: "default",
          blocked: "destructive",
          done: "outline",
          cancelled: "destructive",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "priority",
      label: "Priority",
      defaultVisible: true,
      type: "badge",
      renderConfig: {
        type: "badge",
        variantMap: {
          urgent: "destructive",
          high: "default",
          medium: "secondary",
          low: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "assignee_name",
      label: "Assignee",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "assignee_email",
      label: "Email",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "due_date",
      label: "Due Date",
      defaultVisible: true,
      type: "date",
    },
    {
      id: "project_id",
      label: "Project ID",
      defaultVisible: true,
      type: "number",
    },
    {
      id: "source_system",
      label: "Source",
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
      id: "status",
      label: "Status",
      field: "status",
      options: [
        { value: "open", label: "Open" },
        { value: "in_progress", label: "In Progress" },
        { value: "blocked", label: "Blocked" },
        { value: "done", label: "Done" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      id: "priority",
      label: "Priority",
      field: "priority",
      options: [
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
  ],
};

export default async function TasksPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tasks")
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
