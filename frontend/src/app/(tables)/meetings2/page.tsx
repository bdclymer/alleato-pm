import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { Database } from "@/types/database.types";

type Meetings = Database["public"]["Tables"]["document_metadata"]["Row"];

const config: GenericTableConfig = {
  title: "Meetings",
  description: "All meeting transcripts",
  searchFields: ["title", "summary"],
  exportFilename: "meetings-export.csv",
  editConfig: {
    tableName: "document_metadata",
    editableFields: [
      "title",
      "date",
      "category",
      "source",
      "url",
      "project",
      "participants",
      "key_points",
    ],
  },
  // New features
  enableViewSwitcher: true,
  enableRowSelection: true,
  enableSorting: true,
  defaultSortColumn: "created_at",
  defaultSortDirection: "desc",
  columns: [
    { id: "title", label: "Title", defaultVisible: true },
    { id: "date", label: "Date", defaultVisible: true },
    { id: "type", label: "Type", defaultVisible: true },
    { id: "category", label: "Category", defaultVisible: true },
    { id: "source", label: "Source", defaultVisible: true },
    { id: "url", label: "URL", defaultVisible: true },
    { id: "project", label: "Project", defaultVisible: true },
  ],
  rowClickPath: "/meetings/{id}",
};

export default async function MeetingsPage() {
  const supabase = await createClient();

  const { data: meetings, error } = await supabase
    .from("document_metadata")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading meetings. Please try again later.
      </div>
    );
  }

  return <GenericDataTable data={meetings || []} config={config} />;
}
