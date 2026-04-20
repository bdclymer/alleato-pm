/* eslint-disable design-system/no-raw-heading */
"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { RowActions } from "../RowActions";
import {
  type TableConfig,
  type TableName,
  getRowTitle,
  getRowSubtitle,
} from "@/lib/table-registry";

interface ListViewProps {
  table: TableName;
  config: TableConfig;
  rows: Record<string, unknown>[];
}

export function ListView({ table, config, rows }: ListViewProps) {
  const router = useRouter();
  const pk = config.primaryKey;

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
    <div className="divide-y rounded-lg border">
      {rows.map((row) => {
        const rowId = row[pk] as string | number;
        const title = getRowTitle(table, row);
        const subtitle = getRowSubtitle(table, row);
        const createdAt = row.created_at as string | undefined;

        return (
          <div
            key={rowId}
            className="flex items-center justify-between gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => handleRowClick(rowId)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{title}</h3>
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {subtitle}
                </p>
              )}
              {createdAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Created {formatRelativeDate(createdAt)}
                </p>
              )}
            </div>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <RowActions
                table={table}
                rowId={rowId}
                rowTitle={title}
                config={config}
              />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? "just now" : `${diffMins} minutes ago`;
      }
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    }
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  } catch {
    return dateStr;
  }
}
