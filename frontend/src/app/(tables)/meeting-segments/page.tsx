import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { Database } from "@/types/database.types";

type MeetingSegment = Database["public"]["Tables"]["meeting_segments"]["Row"];

const config: GenericTableConfig = {
  title: "Meeting Segments",
  description: "Chunked meeting content for AI analysis and retrieval",
  searchFields: ["title", "summary"],
  exportFilename: "meeting-segments-export.csv",
  editConfig: {
    tableName: "meeting_segments",
    editableFields: [
      "title",
      "summary",
      "segment_index",
      "start_time",
      "end_time",
      "topics",
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
    {
      id: "title",
      label: "Title",
      defaultVisible: true,
      type: "text",
      isPrimary: true,
    },
    {
      id: "summary",
      label: "Summary",
      defaultVisible: true,
      isSecondary: true,
      renderConfig: {
        type: "truncate",
        maxLength: 100,
      },
    },
    {
      id: "segment_index",
      label: "Segment #",
      defaultVisible: true,
      type: "number",
    },
    {
      id: "start_index",
      label: "Start Index",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "end_index",
      label: "End Index",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "decisions",
      label: "Decisions",
      defaultVisible: true,
      sortable: false,
      renderConfig: {
        type: "array",
        itemType: "text",
        separator: ", ",
      },
    },
    {
      id: "tasks",
      label: "Tasks",
      defaultVisible: true,
      sortable: false,
      renderConfig: {
        type: "array",
        itemType: "text",
        separator: ", ",
      },
    },
    {
      id: "risks",
      label: "Risks",
      defaultVisible: true,
      sortable: false,
      renderConfig: {
        type: "array",
        itemType: "text",
        separator: ", ",
      },
    },
    {
      id: "created_at",
      label: "Created",
      defaultVisible: true,
      type: "date",
    },
    {
      id: "updated_at",
      label: "Updated",
      defaultVisible: false,
      type: "date",
    },
  ],
  rowClickPath: "/meeting-segments/{id}",
};

export default async function MeetingSegmentsPage() {
  const supabase = await createClient();

  const { data: meetingSegments, error } = await supabase
    .from("meeting_segments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading meeting segments. Please try again later.
      </div>
    );
  }

  return <GenericDataTable data={meetingSegments || []} config={config} />;
}
