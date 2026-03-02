import { createClient } from "@/lib/supabase/server";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { TablePageWrapper } from "@/components/tables/table-page-wrapper";
import { Database } from "@/types/database.types";

type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];

const PAGE_TITLE = "Opportunities";
const PAGE_DESCRIPTION = "Track and pursue business opportunities";

const config: GenericTableConfig = {
  title: "Opportunities",
  hideHeader: true,
  description: "Track and pursue business opportunities",
  searchFields: ["description", "type", "owner_name", "next_step"],
  exportFilename: "opportunities-export.csv",
  editConfig: {
    tableName: "opportunities",
    editableFields: [
      "description",
      "type",
      "status",
      "owner_name",
      "owner_email",
      "next_step",
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
      id: "type",
      label: "Type",
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
          identified: "outline",
          pursuing: "default",
          won: "default",
          lost: "outline",
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
      id: "owner_email",
      label: "Owner Email",
      defaultVisible: false,
      type: "email",
    },
    {
      id: "next_step",
      label: "Next Step",
      defaultVisible: true,
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
        { value: "identified", label: "Identified" },
        { value: "pursuing", label: "Pursuing" },
        { value: "won", label: "Won" },
        { value: "lost", label: "Lost" },
      ],
    },
    {
      id: "type",
      label: "Type",
      field: "type",
      options: [
        { value: "cost_savings", label: "Cost Savings" },
        { value: "revenue", label: "Revenue" },
        { value: "efficiency", label: "Efficiency" },
        { value: "quality", label: "Quality" },
      ],
    },
  ],
  rowClickPath: "/opportunities/{id}",
};

export default async function OpportunitiesPage() {
  const supabase = await createClient();

  const { data: opportunities, error } = await supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
        <div className="text-center text-destructive p-6">
          Error loading opportunities. Please try again later.
        </div>
      </TablePageWrapper>
    );
  }

  return (
    <TablePageWrapper title={PAGE_TITLE} description={PAGE_DESCRIPTION}>
      <GenericDataTable data={(opportunities || []) as Opportunity[]} config={config} />
    </TablePageWrapper>
  );
}
