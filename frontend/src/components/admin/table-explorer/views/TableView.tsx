"use client";

import { useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "../RowActions";
import { type ColumnMetadata } from "@/server/db/introspection";
import {
  type TableConfig,
  type TableName,
  getRowTitle,
} from "@/lib/table-registry";

interface TableViewProps {
  table: TableName;
  config: TableConfig;
  columns: ColumnMetadata[];
  rows: Record<string, unknown>[];
  visibleColumns: string[];
  currentSort?: string;
  currentDir: "asc" | "desc";
}

export function TableView({
  table,
  config,
  columns,
  rows,
  visibleColumns,
  currentSort,
  currentDir,
}: TableViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleSort = useCallback(
    (columnName: string) => {
      const params = new URLSearchParams(searchParams.toString());

      // Toggle direction if same column
      if (currentSort === columnName) {
        const newDir = currentDir === "asc" ? "desc" : "asc";
        params.set("dir", newDir);
      } else {
        params.set("sort", columnName);
        params.set("dir", "asc");
      }

      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams, currentSort, currentDir],
  );

  const handleRowClick = (rowId: string | number) => {
    router.push(`/admin/tables/${table}/${rowId}`);
  };

  const displayColumns = columns.filter((col) =>
    visibleColumns.includes(col.column_name),
  );

  const pk = config.primaryKey;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No data found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {displayColumns.map((col) => {
              const isSorted = currentSort === col.column_name;
              return (
                <TableHead key={col.column_name}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-4 h-8 gap-1"
                    onClick={() => handleSort(col.column_name)}
                    disabled={isPending}
                  >
                    {col.label}
                    {isSorted ? (
                      currentDir === "asc" ? (
                        <ArrowUp className="h-4 w-4" />
                      ) : (
                        <ArrowDown className="h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="h-4 w-4 opacity-50" />
                    )}
                  </Button>
                </TableHead>
              );
            })}
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const rowId = row[pk] as string | number;
            const rowTitle = getRowTitle(table, row);

            return (
              <TableRow
                key={rowId}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleRowClick(rowId)}
              >
                {displayColumns.map((col) => (
                  <TableCell key={col.column_name}>
                    <CellValue value={row[col.column_name]} column={col} />
                  </TableCell>
                ))}
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    table={table}
                    rowId={rowId}
                    rowTitle={rowTitle}
                    config={config}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

interface CellValueProps {
  value: unknown;
  column: ColumnMetadata;
}

function CellValue({ value, column }: CellValueProps) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  // Boolean
  if (column.inputType === "boolean") {
    return (
      <Badge variant={value ? "success" : "secondary"}>
        {value ? "Yes" : "No"}
      </Badge>
    );
  }

  // Dates
  if (column.inputType === "datetime" || column.inputType === "date") {
    try {
      const date = new Date(String(value));
      return (
        <span className="tabular-nums">
          {date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            ...(column.inputType === "datetime"
              ? { hour: "2-digit", minute: "2-digit" }
              : {}),
          })}
        </span>
      );
    } catch {
      return <span>{String(value)}</span>;
    }
  }

  // Numbers
  if (column.inputType === "number") {
    const numValue =
      typeof value === "number" ? value : parseFloat(String(value));
    if (!isNaN(numValue)) {
      return (
        <span className="tabular-nums">
          {column.column_name.includes("amount") ||
          column.column_name.includes("price") ||
          column.column_name.includes("cost")
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(numValue)
            : numValue.toLocaleString()}
        </span>
      );
    }
  }

  // JSON
  if (column.inputType === "json") {
    try {
      const str = typeof value === "string" ? value : JSON.stringify(value);
      return (
        <span className="font-mono text-xs max-w-[200px] truncate block">
          {str}
        </span>
      );
    } catch {
      return <span>Invalid JSON</span>;
    }
  }

  // UUID - truncate
  if (column.inputType === "uuid") {
    const str = String(value);
    return (
      <span className="font-mono text-xs" title={str}>
        {str.substring(0, 8)}...
      </span>
    );
  }

  // URL
  if (
    column.inputType === "url" &&
    typeof value === "string" &&
    value.startsWith("http")
  ) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        Link
      </a>
    );
  }

  // Default: truncate long text
  const str = String(value);
  if (str.length > 100) {
    return <span title={str}>{str.substring(0, 100)}...</span>;
  }

  return <span>{str}</span>;
}
