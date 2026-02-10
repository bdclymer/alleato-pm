"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Plus } from "lucide-react";
import { useDeleteRfi } from "@/hooks/use-rfis";
import { RFI_STATUS_OPTIONS } from "@/lib/schemas/rfi-schema";
import type { RFI } from "@/types/database-extensions";

type RfiTableRow = {
  id: string;
  number: string;
  subject: string;
  statusDisplay: string;
  statusKey: string;
  assignees: string;
  due_date: string | null;
  ball_in_court: string | null;
  rfi_manager: string | null;
  responsible_contractor: string | null;
  received_from: string | null;
  created_at: string | null;
};

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

interface RfisClientProps {
  rfis: RFI[];
  projectId: number;
}

export function RfisClient({ rfis, projectId }: RfisClientProps) {
  const router = useRouter();
  const deleteRfi = useDeleteRfi(projectId);

  const tableRows = useMemo<RfiTableRow[]>(
    () =>
      (rfis || []).map((rfi) => ({
        id: rfi.id,
        number: String(rfi.number ?? ""),
        subject: rfi.subject ?? "Untitled RFI",
        statusDisplay: formatStatus(rfi.status ?? "open"),
        statusKey: rfi.status ?? "open",
        assignees: (rfi.assignees ?? []).join(", ") || "—",
        due_date: rfi.due_date,
        ball_in_court: rfi.ball_in_court,
        rfi_manager: rfi.rfi_manager,
        responsible_contractor: rfi.responsible_contractor,
        received_from: rfi.received_from,
        created_at: rfi.created_at,
      })),
    [rfis],
  );


  const tableConfig = useMemo<GenericTableConfig>(
    () => ({
      columns: [
        {
          id: "number",
          label: "#",
          defaultVisible: true,
          type: "text",
          isPrimary: true,
        },
        {
          id: "subject",
          label: "Subject",
          defaultVisible: true,
          type: "text",
        },
        {
          id: "statusDisplay",
          label: "Status",
          defaultVisible: true,
          renderConfig: {
            type: "badge",
            variantMap: {
              Draft: "secondary",
              Open: "default",
              Pending: "outline",
              Closed: "success",
              Void: "destructive",
            },
            defaultVariant: "outline",
          },
        },
        {
          id: "assignees",
          label: "Assignees",
          defaultVisible: true,
          type: "text",
        },
        {
          id: "due_date",
          label: "Due Date",
          defaultVisible: true,
          type: "date",
        },
        {
          id: "ball_in_court",
          label: "Ball In Court",
          defaultVisible: true,
          type: "text",
        },
        {
          id: "rfi_manager",
          label: "RFI Manager",
          defaultVisible: true,
          type: "text",
        },
        {
          id: "responsible_contractor",
          label: "Resp. Contractor",
          defaultVisible: false,
          type: "text",
        },
        {
          id: "received_from",
          label: "Received From",
          defaultVisible: false,
          type: "text",
        },
        {
          id: "created_at",
          label: "Created",
          defaultVisible: false,
          type: "date",
        },
      ],
      searchFields: ["subject", "number", "assignees", "rfi_manager"],
      filters: [
        {
          id: "status-filter",
          label: "Status",
          field: "statusDisplay",
          options: RFI_STATUS_OPTIONS.map((s) => ({
            value: formatStatus(s.value),
            label: s.label,
          })),
        },
      ],
      exportFilename: "rfis-export.csv",
      enableViewSwitcher: true,
      enableSorting: true,
      defaultSortColumn: "number",
      defaultSortDirection: "desc",
      rowClickPath: `/${projectId}/rfis/{id}`,
      rowActions: [
        { id: "view", label: "View" },
        { id: "edit", label: "Edit" },
        { id: "delete", label: "Delete" },
      ],
      onDelete: true,
      requireDeleteConfirmation: true,
    }),
    [projectId],
  );

  const handleDeleteRow = async (id: string | number) => {
    try {
      await deleteRfi.mutateAsync(String(id));
      return {};
    } catch {
      return { error: "Failed to delete RFI" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          onClick={() => router.push(`/${projectId}/rfis/new`)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create RFI
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>CSV</DropdownMenuItem>
            <DropdownMenuItem>PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-background rounded-lg border">
        <GenericDataTable
          data={tableRows}
          config={tableConfig}
          onDeleteRow={handleDeleteRow}
        />
      </div>
    </div>
  );
}
