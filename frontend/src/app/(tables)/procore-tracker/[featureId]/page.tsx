import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { Database } from "@/types/database.types";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Image } from "lucide-react";

type ProcoreFeature = Database["public"]["Tables"]["procore_features"]["Row"];
type ProcorePage = Database["public"]["Tables"]["procore_pages"]["Row"];

interface PageProps {
  params: Promise<{ featureId: string }>;
}

const pagesConfig: GenericTableConfig = {
  title: "Pages",
  description: "Procore pages for this feature",
  searchFields: ["name", "slug", "procore_url"],
  exportFilename: "procore-pages-export.csv",
  editConfig: {
    tableName: "procore_pages",
    editableFields: [
      "name",
      "slug",
      "page_type",
      "status",
      "alleato_route",
      "implementation_notes",
    ],
  },
  columns: [
    {
      id: "name",
      label: "Page",
      defaultVisible: true,
      type: "text",
      isPrimary: true,
    },
    {
      id: "page_type",
      label: "Type",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          list: "outline",
          detail: "secondary",
          form: "default",
          modal: "secondary",
          tab: "outline",
          dashboard: "default",
          settings: "outline",
          report: "secondary",
          other: "outline",
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
          blocked: "destructive",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "procore_url",
      label: "Procore URL",
      defaultVisible: true,
      renderConfig: {
        type: "truncate",
        maxLength: 50,
      },
    },
    {
      id: "alleato_route",
      label: "Alleato Route",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "screenshot_path",
      label: "Screenshot",
      defaultVisible: true,
      renderConfig: {
        type: "truncate",
        maxLength: 30,
      },
    },
    {
      id: "button_count",
      label: "Buttons",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "form_field_count",
      label: "Fields",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "table_column_count",
      label: "Columns",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "implementation_notes",
      label: "Notes",
      defaultVisible: false,
      renderConfig: {
        type: "truncate",
        maxLength: 100,
      },
    },
  ],
  filters: [
    {
      id: "page_type",
      label: "Type",
      field: "page_type",
      options: [
        { value: "list", label: "List" },
        { value: "detail", label: "Detail" },
        { value: "form", label: "Form" },
        { value: "modal", label: "Modal" },
        { value: "tab", label: "Tab" },
        { value: "dashboard", label: "Dashboard" },
        { value: "settings", label: "Settings" },
        { value: "report", label: "Report" },
        { value: "other", label: "Other" },
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
        { value: "blocked", label: "Blocked" },
      ],
    },
  ],
  enableSorting: true,
  enableRowSelection: true,
};

export default async function FeatureDetailPage({ params }: PageProps) {
  const { featureId } = await params;
  const supabase = await createClient();

  // Fetch feature details
  const { data: feature, error: featureError } = await supabase
    .from("procore_features")
    .select("*")
    .eq("id", featureId)
    .single();

  if (featureError || !feature) {
    return (
      <div className="text-center text-red-600">
        Feature not found.
      </div>
    );
  }

  // Fetch pages for this feature
  const { data: pages, error: pagesError } = await supabase
    .from("procore_pages")
    .select("*")
    .eq("feature_id", featureId)
    .order("name", { ascending: true });

  if (pagesError) {
    }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/procore-tracker"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Features
        </Link>
      </div>

      {/* Feature Info */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{feature.name}</h1>
            <p className="text-muted-foreground mt-1">{feature.slug}</p>
          </div>
          <div className="flex gap-2">
            {feature.priority && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                feature.priority === 'critical' ? 'bg-red-100 text-red-800' :
                feature.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                feature.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {feature.priority}
              </span>
            )}
            {feature.status && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                feature.status === 'complete' ? 'bg-green-100 text-green-800' :
                feature.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {feature.status?.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {feature.description && (
          <p className="mt-4 text-sm">{feature.description}</p>
        )}

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Pages:</span>
            <span className="ml-2 font-medium">{pages?.length || 0}</span>
          </div>
          {feature.complexity && (
            <div>
              <span className="text-muted-foreground">Complexity:</span>
              <span className="ml-2 font-medium">{feature.complexity}</span>
            </div>
          )}
          {feature.estimated_hours && (
            <div>
              <span className="text-muted-foreground">Est. Hours:</span>
              <span className="ml-2 font-medium">{feature.estimated_hours}</span>
            </div>
          )}
          {feature.match_score && (
            <div>
              <span className="text-muted-foreground">Match Score:</span>
              <span className="ml-2 font-medium">{feature.match_score}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Pages Table */}
      <GenericDataTable data={pages || []} config={pagesConfig} />
    </div>
  );
}
