"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChangeEvent } from "@/hooks/use-change-events";
interface ChangeEventsTableColumnsProps {
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}
const getStatusBadgeVariant = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case "open":
      return "default";
    case "pending_approval":
      return "secondary";
    case "approved":
      return "success";
    case "rejected":
      return "destructive";
    case "closed":
      return "outline";
    default:
      return "default";
  }
};
const getScopeDisplayName = (scope: string | null) => {
  switch (scope?.toLowerCase()) {
    case "tbd":
      return "TBD";
    case "in_scope":
      return "In Scope";
    case "out_of_scope":
      return "Out of Scope";
    default:
      return scope || "-";
  }
};
const getStatusDisplayName = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case "open":
      return "Open";
    case "pending_approval":
      return "Pending Approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "closed":
      return "Closed";
    default:
      return status || "-";
  }
};
export const ChangeEventsTableColumns = ({
  onView,
  onEdit,
  onDelete,
}: ChangeEventsTableColumnsProps): ColumnDef<ChangeEvent>[] => [
  {
    accessorKey: "number",
    header: "#",
    cell: ({ row }) => {
      const number = row.getValue("number") as string;
      return (
        <div className="font-mono text-sm">
          {" "}
          {number || `CE-${row.original.id}`}{" "}
        </div>
      );
    },
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      return <div className="max-w-xs truncate font-medium"> {title} </div>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant={getStatusBadgeVariant(status)}>
          {" "}
          {getStatusDisplayName(status)}{" "}
        </Badge>
      );
    },
  },
  {
    accessorKey: "scope",
    header: "Scope",
    cell: ({ row }) => {
      const scope = row.getValue("scope") as string;
      return <div className="text-sm"> {getScopeDisplayName(scope)} </div>;
    },
  },
  {
    accessorKey: "reason",
    header: "Change Reason",
    cell: ({ row }) => {
      const reason = row.getValue("reason") as string;
      return <div className="max-w-xs truncate text-sm"> {reason || "-"} </div>;
    },
  },
  {
    accessorKey: "estimated_impact",
    header: "Estimated Impact",
    cell: ({ row }) => {
      const impact = row.getValue("estimated_impact") as number;
      return (
        <div className="text-sm font-mono">
          {" "}
          {impact ? formatCurrency(impact) : "-"}{" "}
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return (
        <div className="text-sm text-muted-foreground">
          {" "}
          {date ? formatDate(date) : "-"}{" "}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const changeEvent = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              data-testid={`change-event-actions-${changeEvent.id}`}
            >
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(changeEvent.id.toString())
              }
            >
              Copy change event ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onView && (
              <DropdownMenuItem onClick={() => onView(Number(changeEvent.id))}>
                <Eye className="mr-2 h-4 w-4" /> View details
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(Number(changeEvent.id))}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(Number(changeEvent.id))}
                className="text-destructive"
                data-testid={`change-event-delete-${changeEvent.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
