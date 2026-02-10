import type { ReactElement } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GenericTableConfig } from "@/components/tables/generic-table-factory";
import type { Database } from "@/types/database.types";
import { FmGlobalDashboardClient } from "./fm-global-dashboard-client";

type TablesRow = Database["public"]["Tables"]["fm_global_tables"]["Row"];
type FiguresRow = Database["public"]["Tables"]["fm_global_figures"]["Row"];

function buildFilterOptions(
  values: Array<string | null | undefined>,
): { value: string; label: string }[] {
  const unique = Array.from(new Set(values.filter(Boolean) as string[]));
  return unique
    .sort((left, right) => left.localeCompare(right))
    .map((value) => ({ value, label: value }));
}

function buildTableFilters(tables: TablesRow[]): GenericTableConfig["filters"] {
  const systemTypeOptions = buildFilterOptions(
    tables.map((table) => table.system_type),
  );
  const asrsOptions = buildFilterOptions(tables.map((table) => table.asrs_type));
  const containerOptions = buildFilterOptions(
    tables.map((table) => table.container_type),
  );
  const statusOptions = buildFilterOptions(
    tables.map((table) => table.extraction_status),
  );

  return [
    {
      id: "system_type",
      label: "System Type",
      field: "system_type",
      options: systemTypeOptions,
    },
    { id: "asrs_type", label: "ASRS Type", field: "asrs_type", options: asrsOptions },
    {
      id: "container_type",
      label: "Container Type",
      field: "container_type",
      options: containerOptions,
    },
    {
      id: "extraction_status",
      label: "Status",
      field: "extraction_status",
      options: statusOptions,
    },
  ].filter((filter) => filter.options.length > 0);
}

function buildFigureFilters(figures: FiguresRow[]): GenericTableConfig["filters"] {
  const typeOptions = buildFilterOptions(
    figures.map((figure) => figure.figure_type),
  );
  const asrsOptions = buildFilterOptions(
    figures.map((figure) => figure.asrs_type),
  );
  const containerOptions = buildFilterOptions(
    figures.map((figure) => figure.container_type),
  );

  return [
    { id: "figure_type", label: "Figure Type", field: "figure_type", options: typeOptions },
    { id: "asrs_type", label: "ASRS Type", field: "asrs_type", options: asrsOptions },
    {
      id: "container_type",
      label: "Container Type",
      field: "container_type",
      options: containerOptions,
    },
  ].filter((filter) => filter.options.length > 0);
}

const tableSearchFields = [
  "table_id",
  "title",
  "asrs_type",
  "system_type",
  "protection_scheme",
  "container_type",
];

const tableColumns: GenericTableConfig["columns"] = [
  { id: "table_number", label: "Table #", defaultVisible: true, type: "number", isPrimary: true },
  { id: "table_id", label: "Table ID", defaultVisible: true, type: "text" },
  { id: "title", label: "Title", defaultVisible: true, type: "text", isSecondary: true },
  { id: "asrs_type", label: "ASRS Type", defaultVisible: true, type: "badge" },
  { id: "system_type", label: "System Type", defaultVisible: true, type: "badge" },
  { id: "protection_scheme", label: "Protection Scheme", defaultVisible: true, type: "text" },
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
  { id: "container_type", label: "Container Type", defaultVisible: false, type: "text" },
  { id: "storage_height_max_ft", label: "Storage Height Max (ft)", defaultVisible: true, type: "number" },
  { id: "ceiling_height_min_ft", label: "Ceiling Height Min (ft)", defaultVisible: false, type: "number" },
  { id: "ceiling_height_max_ft", label: "Ceiling Height Max (ft)", defaultVisible: false, type: "number" },
  { id: "estimated_page_number", label: "Estimated Page #", defaultVisible: false, type: "number" },
  {
    id: "commodity_types",
    label: "Commodity Types",
    defaultVisible: false,
    sortable: false,
    renderConfig: { type: "array", itemType: "badge" },
  },
  {
    id: "special_conditions",
    label: "Special Conditions",
    defaultVisible: false,
    sortable: false,
    renderConfig: { type: "array", itemType: "text", separator: ", " },
  },
  {
    id: "section_references",
    label: "Section References",
    defaultVisible: false,
    sortable: false,
    renderConfig: { type: "array", itemType: "text", separator: ", " },
  },
  { id: "figures", label: "Primary Figure ID", defaultVisible: false, type: "text" },
  { id: "created_at", label: "Created", defaultVisible: false, type: "date" },
  { id: "updated_at", label: "Updated", defaultVisible: false, type: "date" },
];

function buildTablesConfig(tables: TablesRow[]): GenericTableConfig {
  return {
    title: "FM Global Tables",
    description: "Reference tables for FM Global sprinkler protection data",
    searchFields: tableSearchFields,
    exportFilename: "fm-global-tables-export.csv",
    columns: tableColumns,
    filters: buildTableFilters(tables),
    enableSorting: true,
    enableViewSwitcher: true,
    defaultSortColumn: "table_number",
    defaultSortDirection: "asc",
  };
}

const figureSearchFields = [
  "figure_number",
  "title",
  "figure_type",
  "asrs_type",
  "container_type",
  "clean_caption",
  "normalized_summary",
];

const figureColumns: GenericTableConfig["columns"] = [
  { id: "figure_number", label: "Figure #", defaultVisible: true, type: "number", isPrimary: true },
  { id: "title", label: "Title", defaultVisible: true, type: "text", isSecondary: true },
  { id: "figure_type", label: "Figure Type", defaultVisible: true, type: "badge" },
  { id: "asrs_type", label: "ASRS Type", defaultVisible: true, type: "badge" },
  { id: "container_type", label: "Container Type", defaultVisible: false, type: "text" },
  { id: "page_number", label: "Page #", defaultVisible: false, type: "number" },
  {
    id: "related_tables",
    label: "Related Tables",
    defaultVisible: false,
    sortable: false,
    renderConfig: { type: "array", itemType: "text", separator: ", " },
  },
  { id: "section_reference", label: "Section Reference", defaultVisible: false, type: "text" },
  {
    id: "applicable_commodities",
    label: "Applicable Commodities",
    defaultVisible: false,
    sortable: false,
    renderConfig: { type: "array", itemType: "badge" },
  },
  {
    id: "special_conditions",
    label: "Special Conditions",
    defaultVisible: false,
    sortable: false,
    renderConfig: { type: "array", itemType: "text", separator: ", " },
  },
  { id: "image", label: "Image", defaultVisible: false, type: "text" },
  { id: "created_at", label: "Created", defaultVisible: false, type: "date" },
  { id: "updated_at", label: "Updated", defaultVisible: false, type: "date" },
];

function buildFiguresConfig(figures: FiguresRow[]): GenericTableConfig {
  return {
    title: "FM Global Figures",
    description: "Figure references and extracted captions for FM Global tables",
    searchFields: figureSearchFields,
    exportFilename: "fm-global-figures-export.csv",
    columns: figureColumns,
    filters: buildFigureFilters(figures),
    enableSorting: true,
    enableViewSwitcher: true,
    defaultSortColumn: "figure_number",
    defaultSortDirection: "asc",
  };
}

export default async function FMGlobalDashboardPage(): Promise<ReactElement> {
  const supabase = await createClient();
  const [{ data: tables, error: tablesError }, { data: figures, error: figuresError }] =
    await Promise.all([
      supabase.from("fm_global_tables").select("*").order("table_number", { ascending: true }),
      supabase.from("fm_global_figures").select("*").order("figure_number", { ascending: true }),
    ]);

  if (tablesError || figuresError) {
    return (
      <div className="text-center text-destructive">
        Error loading FM Global dashboard data. Please try again later.
      </div>
    );
  }

  const tableRows = tables ?? [];
  const figureRows = figures ?? [];

  return (
    <>
      <PageHeader
        title="FM Global Dashboard"
        description="Browse FM Global tables and figures, filter by system type, and jump to the matching form."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/fm-global/form">Open FM Global Form</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/fm_global_tables">Tables Directory</Link>
            </Button>
          </div>
        }
      />
      <PageContainer maxWidth="full">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Tables</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {tableRows.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Figures</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {figureRows.length}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>What To Do Next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Use filters to narrow to the right system and ASRS type.</div>
              <div>Open the form to match exact sprinkler configurations.</div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-6">
          <FmGlobalDashboardClient
            tables={tableRows}
            figures={figureRows}
            tablesConfig={buildTablesConfig(tableRows)}
            figuresConfig={buildFiguresConfig(figureRows)}
          />
        </div>
      </PageContainer>
    </>
  );
}
