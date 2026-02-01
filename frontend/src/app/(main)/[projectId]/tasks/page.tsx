import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TableLayout } from "@/components/layouts/TableLayout";
import { getProjectInfo } from "@/lib/supabase/project-fetcher";

const config: GenericTableConfig = {
  title: "Tasks",
  description: "Manage project tasks and assignments",
  searchFields: ["task_description", "assigned_to"],
  exportFilename: "tasks-export.csv",
  editConfig: {
    tableName: "project_tasks",
    editableFields: [
      "task_description",
      "assigned_to",
      "status",
      "priority",
      "due_date",
    ],
  },
  columns: [
    {
      id: "task_description",
      label: "Task",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          completed: "outline",
          in_progress: "default",
          pending: "secondary",
          blocked: "destructive",
        },
        defaultVariant: "secondary",
      },
    },
    {
      id: "priority",
      label: "Priority",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          high: "destructive",
          medium: "default",
          low: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "assigned_to",
      label: "Assigned To",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "due_date",
      label: "Due Date",
      defaultVisible: true,
      type: "date",
    },
    {
      id: "created_at",
      label: "Created",
      defaultVisible: false,
      type: "date",
    },
    {
      id: "updated_at",
      label: "Updated",
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
        { value: "pending", label: "Pending" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "blocked", label: "Blocked" },
      ],
    },
    {
      id: "priority",
      label: "Priority",
      field: "priority",
      options: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
  ],
};

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { numericProjectId, supabase } =
    await getProjectInfo(projectId);

  const { data: tasks, error } = await supabase
    .from("project_tasks")
    .select("*")
    .eq("project_id", numericProjectId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <TableLayout>
        <div className="text-center text-destructive p-6">
          Error loading tasks. Please try again later.
        </div>
      </TableLayout>
    );
  }

  return (
    <TableLayout>
      <GenericDataTable data={tasks || []} config={config} />
    </TableLayout>
  );
}
