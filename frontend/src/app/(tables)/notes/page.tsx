import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { Database } from "@/types/database.types";

type Note = Database["public"]["Tables"]["notes"]["Row"];

const config: GenericTableConfig = {
  title: "Notes",
  description: "Project notes and annotations",
  searchFields: ["body", "created_by"],
  exportFilename: "notes-export.csv",
  editConfig: {
    tableName: "notes",
    editableFields: ["body", "created_by"],
  },
  columns: [
    {
      id: "body",
      label: "Note",
      defaultVisible: true,
      renderConfig: {
        type: "truncate",
        maxLength: 150,
      },
    },
    {
      id: "project_id",
      label: "Project ID",
      defaultVisible: true,
      type: "number",
    },
    {
      id: "created_by",
      label: "Created By",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "archived",
      label: "Status",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          true: "outline",
          false: "default",
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
      id: "archived",
      label: "Status",
      field: "archived",
      options: [
        { value: "false", label: "Active" },
        { value: "true", label: "Archived" },
      ],
    },
  ],
  rowClickPath: "/notes/{id}",
};

export default async function NotesPage() {
  const supabase = await createClient();

  const { data: notes, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading notes. Please try again later.
      </div>
    );
  }

  return <GenericDataTable data={notes || []} config={config} />;
}
