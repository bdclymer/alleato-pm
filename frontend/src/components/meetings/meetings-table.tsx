"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  Calendar,
  Video,
  Headphones,
  ExternalLink,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ds";
import { format } from "date-fns";
import Link from "next/link";
import type { Database } from "@/types/database.types";

type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];

interface MeetingsTableProps {
  meetings: Meeting[];
  projectId: string;
  onEdit?: (meeting: Meeting) => void;
}

export function MeetingsTable({
  meetings,
  projectId,
  onEdit,
}: MeetingsTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const applyViewport = () => setIsMobileViewport(mediaQuery.matches);
    applyViewport();
    mediaQuery.addEventListener("change", applyViewport);
    return () => mediaQuery.removeEventListener("change", applyViewport);
  }, []);

  const columns: ColumnDef<Meeting>[] = [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <Link
          href={`/${projectId}/meetings/${row.original.id}`}
          className="font-medium text-neutral-900 hover:text-brand transition-colors"
        >
          {row.original.title || "Untitled Meeting"}
        </Link>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        if (!row.original.date)
          return <span className="text-neutral-400">—</span>;
        return (
          <div className="flex items-center gap-2 text-sm text-neutral-700">
            <Calendar className="h-4 w-4 text-neutral-400" />
            {format(new Date(row.original.date), "MMM d, yyyy")}
          </div>
        );
      },
    },
    {
      accessorKey: "duration_minutes",
      header: "Duration",
      cell: ({ row }) => {
        if (!row.original.duration_minutes)
          return <span className="text-neutral-400">—</span>;
        return (
          <span className="text-sm text-neutral-700">
            {row.original.duration_minutes} min
          </span>
        );
      },
    },
    {
      accessorKey: "participants",
      header: "Participants",
      cell: ({ row }) => {
        const arr = row.original.participants_array;
        if (!arr || arr.length === 0)
          return <span className="text-neutral-400">—</span>;
        const count = arr.length;
        return (
          <span className="text-sm text-neutral-700">
            {count} {count === 1 ? "person" : "people"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        if (!status) return <span className="text-neutral-400">—</span>;
        return <StatusBadge status={status} />;
      },
    },
    {
      id: "embedded",
      header: "Embedded",
      cell: ({ row }) => {
        const status = row.original.status;
        const isEmbedded = status?.toLowerCase() === "complete";
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              isEmbedded ? "text-green-700" : "text-neutral-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isEmbedded ? "bg-green-500" : "bg-neutral-300"
              }`}
            />
            {isEmbedded ? "Yes" : "No"}
          </span>
        );
      },
    },
    {
      accessorKey: "access_level",
      header: "Access",
      cell: ({ row }) => {
        const access = row.original.access_level;
        if (!access) return <span className="text-neutral-400">—</span>;

        const accessColors: Record<string, string> = {
          public: "bg-green-100 text-green-800",
          private: "bg-orange-100 text-orange-800",
          restricted: "bg-red-100 text-red-800",
        };

        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${accessColors[access.toLowerCase()] || "bg-neutral-100 text-neutral-800"}`}
          >
            {access}
          </span>
        );
      },
    },
    {
      id: "media",
      header: "Media",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.video && (
            <a
              href={row.original.video}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-dark transition-colors"
              title="Video recording"
            >
              <Video className="h-4 w-4" />
            </a>
          )}
          {row.original.audio && (
            <a
              href={row.original.audio}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-dark transition-colors"
              title="Audio recording"
            >
              <Headphones className="h-4 w-4" />
            </a>
          )}
          {row.original.fireflies_link && (
            <a
              href={row.original.fireflies_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-dark transition-colors"
              title="Fireflies recording"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {!row.original.video &&
            !row.original.audio &&
            !row.original.fireflies_link && (
              <span className="text-neutral-400">—</span>
            )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/${projectId}/meetings/${row.original.id}`}>
                View details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/${projectId}/meetings/${row.original.id}/prep`}>
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Meeting Prep
              </Link>
            </DropdownMenuItem>
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                Edit meeting
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const table = useReactTable({
    data: meetings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  if (isMobileViewport) {
    return (
      <div className="space-y-2">
        {meetings.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
            No meetings found.
          </div>
        ) : (
          meetings.map((meeting) => (
            <div key={meeting.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/${projectId}/meetings/${meeting.id}`}
                  className="text-sm font-medium text-foreground"
                >
                  {meeting.title || "Untitled Meeting"}
                </Link>
                {meeting.status ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {meeting.status}
                  </span>
                ) : null}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {meeting.date ? format(new Date(meeting.date), "MMM d, yyyy") : "No date"}
                {meeting.duration_minutes ? ` · ${meeting.duration_minutes} min` : ""}
              </div>
              {onEdit ? (
                <div className="mt-3">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => onEdit(meeting)}>
                    Edit
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 bg-background">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="bg-neutral-50">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-neutral-50">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No meetings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
