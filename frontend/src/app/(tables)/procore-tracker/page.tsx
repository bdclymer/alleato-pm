import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { Database } from "@/types/database.types";

type ProcoreFeature = Database["public"]["Tables"]["procore_features"]["Row"];

const config: GenericTableConfig = {
  title: "Procore Feature Tracker",
  description: "Track Procore features and implementation status",
  searchFields: ["name", "description", "slug"],
  exportFilename: "procore-features-export.csv",
  editConfig: {
    tableName: "procore_features",
    editableFields: [
      "name",
      "slug",
      "description",
      "priority",
      "status",
      "complexity",
      "estimated_hours",
      "ai_enhancement_possible",
      "ai_enhancement_notes",
      "include_in_rebuild",
    ],
  },
  columns: [
    {
      id: "name",
      label: "Feature",
      defaultVisible: true,
      type: "text",
      isPrimary: true,
    },
    {
      id: "slug",
      label: "Slug",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "priority",
      label: "Priority",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          critical: "destructive",
          high: "default",
          medium: "secondary",
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
          not_started: "outline",
          in_progress: "default",
          needs_review: "secondary",
          complete: "success",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "page_count",
      label: "Pages",
      defaultVisible: true,
      type: "number",
    },
    {
      id: "complexity",
      label: "Complexity",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          low: "outline",
          medium: "secondary",
          high: "default",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "estimated_hours",
      label: "Est. Hours",
      defaultVisible: true,
      type: "number",
    },
    {
      id: "description",
      label: "Description",
      defaultVisible: false,
      renderConfig: {
        type: "truncate",
        maxLength: 80,
      },
    },
    {
      id: "ai_enhancement_possible",
      label: "AI Enhancement",
      defaultVisible: false,
      renderConfig: {
        type: "boolean",
        trueLabel: "Yes",
        falseLabel: "No",
      },
    },
    {
      id: "include_in_rebuild",
      label: "Include in Rebuild",
      defaultVisible: false,
      renderConfig: {
        type: "boolean",
        trueLabel: "Yes",
        falseLabel: "No",
      },
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
      id: "priority",
      label: "Priority",
      field: "priority",
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
        { value: "not_started", label: "Not Started" },
        { value: "in_progress", label: "In Progress" },
        { value: "needs_review", label: "Needs Review" },
        { value: "complete", label: "Complete" },
      ],
    },
    {
      id: "complexity",
      label: "Complexity",
      field: "complexity",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
      ],
    },
  ],
  rowClickPath: "/procore-tracker/{id}",
  enableSorting: true,
  enableRowSelection: true,
  enableViewSwitcher: true,
};

export default async function ProcoreTrackerPage() {
  const supabase = await createClient();

  const { data: features, error } = await supabase
    .from("procore_features")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading Procore features. Please try again later.
      </div>
    );
  }

  return <GenericDataTable data={features || []} config={config} />;
}
