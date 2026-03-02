import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";
import { Database } from "@/types/database.types";

type Risk = Database["public"]["Tables"]["risks"]["Row"];

const PAGE_TITLE = "Risks";
const PAGE_DESCRIPTION = "Track and manage project risks";

const config: GenericTableConfig = {
  title: "Risks",
  hideHeader: true,
  description: "Track and manage project risks",
  searchFields: ["description", "category", "owner_name", "mitigation_plan"],
  exportFilename: "risks-export.csv",
  editConfig: {
    tableName: "risks",
    editableFields: [
      "description",
      "category",
      "status",
      "impact",
      "likelihood",
      "owner_name",
      "mitigation_plan",
    ],
  },
  columns: [
    {
      id: "description",
      label: "Description",
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
      id: "status",
      label: "Status",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          open: "destructive",
          mitigated: "default",
          closed: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "impact",
      label: "Impact",
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
      id: "likelihood",
      label: "Likelihood",
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
      id: "owner_name",
      label: "Owner",
      defaultVisible: true,
      type: "text",
    },
    {
      id: "mitigation_plan",
      label: "Mitigation Plan",
      defaultVisible: false,
      type: "text",
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
  filters: [
    {
      id: "status",
      label: "Status",
      field: "status",
      options: [
        { value: "open", label: "Open" },
        { value: "mitigated", label: "Mitigated" },
        { value: "closed", label: "Closed" },
      ],
    },
    {
      id: "impact",
      label: "Impact",
      field: "impact",
      options: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    {
      id: "likelihood",
      label: "Likelihood",
      field: "likelihood",
      options: [
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
  ],
  rowClickPath: "/risks/{id}",
};

export default async function RisksPage() {
  const supabase = await createClient();

  const { data: risks, error } = await supabase
    .from("risks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading risks. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  return (
    <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <GenericDataTable data={(risks || []) as Risk[]} config={config} />
    </TablePageWrapper>
  );
}
