"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, MoreHorizontal, SquarePen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useDeleteRfi } from "@/hooks/use-rfis";
import {
  CellDate,
  CellStatus,
  CellText,
} from "@/components/tables/unified/table-primitives";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RFI_STATUS_OPTIONS } from "@/lib/schemas/rfi-schema";
import type { RFI } from "@/types/database-extensions";

interface GetRfiColumnsOptions {
  projectId: number;
}

function formatAssignees(assignees: string[] | null | undefined): string {
  if (!assignees || assignees.length === 0) return "—";
  return assignees.join(", ");
}

function RfiRowActions({ rfi, projectId }: { rfi: RFI; projectId: number }) {
  const router = useRouter();
  const deleteRfi = useDeleteRfi(projectId);

  const handleDelete = async () => {
    try {
      await deleteRfi.mutateAsync(String(rfi.id));
      toast.success("RFI deleted");
    } catch {
      toast.error("Failed to delete RFI");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Row actions">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/${projectId}/rfis/${rfi.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${projectId}/rfis/${rfi.id}?mode=edit`)}>
          <SquarePen className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getRfiColumns({ projectId }: GetRfiColumnsOptions): ColumnDef<RFI>[] {
  return [
    {
      id: "select",
      size: 40,
      minSize: 40,
      maxSize: 40,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "number",
      size: 60,
      minSize: 50,
      header: "#",
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{row.getValue("number")}</span>
      ),
      meta: { label: "#" },
    },
    {
      accessorKey: "subject",
      size: 280,
      minSize: 120,
      header: "Subject",
      cell: ({ row }) => (
        <Link
          href={`/${projectId}/rfis/${row.original.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <CellText value={(row.getValue("subject") as string) ?? "Untitled RFI"} />
        </Link>
      ),
      enableColumnFilter: true,
      meta: { label: "Subject", variant: "text" },
    },
    {
      accessorKey: "status",
      size: 110,
      minSize: 80,
      header: "Status",
      cell: ({ row }) => <CellStatus value={row.getValue("status") as string} />,
      enableColumnFilter: true,
      meta: {
        label: "Status",
        variant: "select",
        options: RFI_STATUS_OPTIONS.map((s) => ({ label: s.label, value: s.value })),
      },
    },
    {
      accessorKey: "assignees",
      size: 160,
      minSize: 80,
      header: "Assignees",
      cell: ({ row }) => (
        <CellText value={formatAssignees(row.getValue("assignees") as string[])} />
      ),
      enableColumnFilter: true,
      meta: { label: "Assignees", variant: "text" },
    },
    {
      accessorKey: "due_date",
      size: 120,
      minSize: 80,
      header: "Due Date",
      cell: ({ row }) => <CellDate value={row.getValue("due_date") as string} />,
      enableColumnFilter: true,
      meta: { label: "Due Date", variant: "dateRange" },
    },
    {
      accessorKey: "ball_in_court",
      size: 140,
      minSize: 80,
      header: "Ball In Court",
      cell: ({ row }) => <CellText value={row.getValue("ball_in_court") as string} />,
      enableColumnFilter: true,
      meta: { label: "Ball In Court", variant: "text" },
    },
    {
      accessorKey: "rfi_manager",
      size: 140,
      minSize: 80,
      header: "RFI Manager",
      cell: ({ row }) => <CellText value={row.getValue("rfi_manager") as string} />,
      enableColumnFilter: true,
      meta: { label: "RFI Manager", variant: "text" },
    },
    {
      accessorKey: "responsible_contractor",
      size: 160,
      minSize: 80,
      header: "Resp. Contractor",
      cell: ({ row }) => <CellText value={row.getValue("responsible_contractor") as string} />,
      enableColumnFilter: true,
      meta: { label: "Resp. Contractor", variant: "text" },
    },
    {
      accessorKey: "received_from",
      size: 140,
      minSize: 80,
      header: "Received From",
      cell: ({ row }) => <CellText value={row.getValue("received_from") as string} />,
      enableColumnFilter: true,
      meta: { label: "Received From", variant: "text" },
    },
    {
      accessorKey: "location",
      size: 120,
      minSize: 80,
      header: "Location",
      cell: ({ row }) => <CellText value={row.getValue("location") as string} />,
      enableColumnFilter: true,
      meta: { label: "Location", variant: "text" },
    },
    {
      accessorKey: "rfi_stage",
      size: 120,
      minSize: 80,
      header: "RFI Stage",
      cell: ({ row }) => <CellText value={row.getValue("rfi_stage") as string} />,
      enableColumnFilter: true,
      meta: { label: "RFI Stage", variant: "text" },
    },
    {
      accessorKey: "schedule_impact",
      size: 140,
      minSize: 80,
      header: "Schedule Impact",
      cell: ({ row }) => <CellText value={row.getValue("schedule_impact") as string} />,
      enableColumnFilter: true,
      meta: { label: "Schedule Impact", variant: "text" },
    },
    {
      accessorKey: "cost_impact",
      size: 120,
      minSize: 80,
      header: "Cost Impact",
      cell: ({ row }) => <CellText value={row.getValue("cost_impact") as string} />,
      enableColumnFilter: true,
      meta: { label: "Cost Impact", variant: "text" },
    },
    {
      accessorKey: "created_at",
      size: 120,
      minSize: 80,
      header: "Created",
      cell: ({ row }) => <CellDate value={row.getValue("created_at") as string} />,
      enableColumnFilter: true,
      meta: { label: "Created", variant: "dateRange" },
    },
    {
      id: "actions",
      size: 48,
      minSize: 48,
      maxSize: 48,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      header: "",
      cell: ({ row }) => <RfiRowActions rfi={row.original} projectId={projectId} />,
    },
  ];
}
