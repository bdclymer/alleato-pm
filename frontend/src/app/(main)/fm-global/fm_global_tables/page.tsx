import { createClient } from "@/lib/supabase/server";
import type { GenericTableConfig } from "@/components/tables/generic-table-factory";
import { GenericConfigUnifiedTable } from "@/components/tables/generic-config-unified-table";
import { PageShell } from "@/components/layout";

const config: GenericTableConfig = {
  title: "FM Global Tables",
  description: "Reference tables for FM Global sprinkler protection data",
  searchFields: [
    "table_id",
    "title",
    "asrs_type",
    "system_type",
    "protection_scheme",
    "container_type",
  ],
  exportFilename: "fm-global-tables-export.csv",
  columns: [
    {
      id: "table_number",
      label: "Table #",
      defaultVisible: true,
      type: "number",
      isPrimary: true,
    },
    {
      id: "table_id",
      label: "Table ID",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "title",
      label: "Title",
      defaultVisible: true,
      type: "text",
      isSecondary: true,
    },
    {
      id: "asrs_type",
      label: "ASRS Type",
      defaultVisible: true,
      type: "badge",
    },
    {
      id: "system_type",
      label: "System Type",
      defaultVisible: true,
      type: "badge",
    },
    {
      id: "protection_scheme",
      label: "Protection Scheme",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "extraction_status",
      label: "Status",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          pending: "outline",
          extracted: "secondary",
          vectorized: "default",
          verified: "default",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "commodity_types",
      label: "Commodity Types",
      defaultVisible: false,
      sortable: false,
      renderConfig: {
        type: "array",
        itemType: "badge",
      },
    },
    {
      id: "storage_height_max_ft",
      label: "Storage Height Max (ft)",
      defaultVisible: true,
      type: "number",
    },
    {
      id: "ceiling_height_min_ft",
      label: "Ceiling Height Min (ft)",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "ceiling_height_max_ft",
      label: "Ceiling Height Max (ft)",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "aisle_width_requirements",
      label: "Aisle Width Requirements",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "rack_configuration",
      label: "Rack Configuration",
      defaultVisible: false,
      renderConfig: {
        type: "json",
        maxLength: 140,
      },
    },
    {
      id: "sprinkler_specifications",
      label: "Sprinkler Specifications",
      defaultVisible: false,
      renderConfig: {
        type: "json",
        maxLength: 140,
      },
    },
    {
      id: "design_parameters",
      label: "Design Parameters",
      defaultVisible: false,
      renderConfig: {
        type: "json",
        maxLength: 140,
      },
    },
    {
      id: "special_conditions",
      label: "Special Conditions",
      defaultVisible: false,
      sortable: false,
      renderConfig: {
        type: "array",
        itemType: "text",
        separator: ", ",
      },
    },
    {
      id: "applicable_figures",
      label: "Applicable Figures",
      defaultVisible: false,
      sortable: false,
      renderConfig: {
        type: "array",
        itemType: "text",
        separator: ", ",
      },
    },
    {
      id: "estimated_page_number",
      label: "Estimated Page #",
      defaultVisible: false,
      type: "number",
    },
    {
      id: "section_references",
      label: "Section References",
      defaultVisible: false,
      sortable: false,
      renderConfig: {
        type: "array",
        itemType: "text",
        separator: ", ",
      },
    },
    {
      id: "container_type",
      label: "Container Type",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "figures",
      label: "Figures",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "image",
      label: "Image",
      defaultVisible: false,
      type: "text",
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
    {
      id: "raw_data",
      label: "Raw Data",
      defaultVisible: false,
      renderConfig: {
        type: "json",
        maxLength: 140,
      },
    },
    {
      id: "id",
      label: "ID",
      defaultVisible: false,
      type: "text",
    },
  ],
  filters: [
    {
      id: "extraction_status",
      label: "Status",
      field: "extraction_status",
      options: [
        { value: "pending", label: "Pending" },
        { value: "extracted", label: "Extracted" },
        { value: "vectorized", label: "Vectorized" },
        { value: "verified", label: "Verified" },
      ],
    },
  ],
  enableSorting: true,
  enableViewSwitcher: true,
  defaultSortColumn: "table_number",
  defaultSortDirection: "asc",
};

export default async function FMGlobalTablesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fm_global_tables")
    .select("*")
    .order("table_number", { ascending: true });

  if (error) {
    return (
      <PageShell
        variant="table"
        title="FM Global Tables"
        description="Reference tables for FM Global sprinkler protection data"
      >
        <p className="py-6 text-center text-destructive">
          Error loading FM Global tables. Please try again later.
        </p>
      </PageShell>
    );
  }

  return (
    <GenericConfigUnifiedTable
      data={data || []}
      config={config}
      title="FM Global Tables"
      description="Reference tables for FM Global sprinkler protection data"
      entityKey="fm-global-tables-directory"
      emptyTitle="No FM Global tables found"
      emptyDescription="No FM Global table records have been imported yet."
    />
  );
}
