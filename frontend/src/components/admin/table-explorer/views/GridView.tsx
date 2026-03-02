"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { RowActions } from "../RowActions";
import { type ColumnMetadata } from "@/server/db/introspection";
import {
  type TableConfig,
  type TableName,
  getRowTitle,
  getRowSubtitle,
} from "@/lib/table-registry";

interface GridViewProps {
  table: TableName;
  config: TableConfig;
  columns: ColumnMetadata[];
  rows: Record<string, unknown>[];
}

export function GridView({ table, config, columns, rows }: GridViewProps) {
  const router = useRouter();
  const pk = config.primaryKey;
  const hiddenColumns = config.hiddenColumns;

  // Get visible columns for card content (first 4 non-hidden, non-pk)
  const displayColumns = columns
    .filter(
      (col) =>
        !hiddenColumns.includes(col.column_name) &&
        col.column_name !== pk &&
        col.column_name !== "created_at" &&
        col.column_name !== "updated_at",
    )
    .slice(0, 4);

  const handleRowClick = (rowId: string | number) => {
    router.push(`/admin/tables/${table}/${rowId}`);
  };

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rows.map((row) => {
        const rowId = row[pk] as string | number;
        const title = getRowTitle(table, row);
        const subtitle = getRowSubtitle(table, row);
        const createdAt = row.created_at as string | undefined;
        const updatedAt = row.updated_at as string | undefined;

        return (
          <Card
            key={rowId}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => handleRowClick(rowId)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{title}</h3>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    table={table}
                    rowId={rowId}
                    rowTitle={title}
                    config={config}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <dl className="space-y-2 text-sm">
                {displayColumns.map((col) => {
                  const value = row[col.column_name];
                  if (value === null || value === undefined) return null;

                  return (
                    <div
                      key={col.column_name}
                      className="flex justify-between gap-2"
                    >
                      <dt className="text-muted-foreground truncate">
                        {col.label}
                      </dt>
                      <dd className="font-medium truncate text-right max-w-[60%]">
                        {formatValue(value, col)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </CardContent>
            {(createdAt || updatedAt) && (
              <CardFooter className="pt-2">
                <p className="text-xs text-muted-foreground">
                  {updatedAt
                    ? `Updated ${formatDate(updatedAt)}`
                    : createdAt
                      ? `Created ${formatDate(createdAt)}`
                      : null}
                </p>
              </CardFooter>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function formatValue(value: unknown, column: ColumnMetadata): string {
  if (value === null || value === undefined) return "—";

  if (column.inputType === "boolean") {
    return value ? "Yes" : "No";
  }

  if (column.inputType === "datetime" || column.inputType === "date") {
    try {
      const date = new Date(String(value));
      return date.toLocaleDateString();
    } catch {
      return String(value);
    }
  }

  if (column.inputType === "number") {
    const num = typeof value === "number" ? value : parseFloat(String(value));
    if (!isNaN(num)) {
      if (
        column.column_name.includes("amount") ||
        column.column_name.includes("price") ||
        column.column_name.includes("cost")
      ) {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(num);
      }
      return num.toLocaleString();
    }
  }

  if (column.inputType === "uuid") {
    return String(value).substring(0, 8) + "...";
  }

  const str = String(value);
  return str.length > 50 ? str.substring(0, 47) + "..." : str;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
