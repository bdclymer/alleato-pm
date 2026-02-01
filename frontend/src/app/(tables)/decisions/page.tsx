import { getDecisions } from "@/lib/db/decisions";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";

export const dynamic = "force-dynamic";

const config: GenericTableConfig = {
  title: "Decisions",
  description: "Track important project and business decisions",
  searchFields: ["description", "impact", "owner_name", "rationale"],
  exportFilename: "decisions-export.csv",
  editConfig: {
    tableName: "decisions",
    editableFields: [
      "description",
      "status",
      "impact",
      "owner_name",
      "owner_email",
      "rationale",
      "effective_date",
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
      id: "document_metadata",
      label: "Meeting",
      defaultVisible: true,
      renderConfig: {
        type: "nested",
        path: "title",
        fallback: "No meeting",
      },
    },
    {
      id: "status",
      label: "Status",
      defaultVisible: true,
      renderConfig: {
        type: "badge",
        variantMap: {
          pending: "outline",
          approved: "default",
          rejected: "outline",
          implemented: "outline",
        },
        defaultVariant: "outline",
      },
    },
    {
      id: "impact",
      label: "Impact",
      defaultVisible: true,
      type: "text",
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
      id: "rationale",
      label: "Rationale",
      defaultVisible: false,
      type: "text",
    },
    {
      id: "effective_date",
      label: "Effective Date",
      defaultVisible: true,
      type: "date",
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
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "implemented", label: "Implemented" },
      ],
    },
  ],
  rowClickPath: "/decisions/{id}",
};

export default async function DecisionsPage() {
  try {
    const decisions = await getDecisions();

    return (
      <div>
        <GenericDataTable
          data={decisions as unknown as Record<string, unknown>[]}
          config={config}
        />
      </div>
    );
  } catch (error) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center text-destructive">
          Error loading decisions. Please try again later.
        </div>
      </div>
    );
  }
}
