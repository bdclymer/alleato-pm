"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./SearchBar";
import { ViewSwitcher } from "./ViewSwitcher";
import { ColumnPicker } from "./ColumnPicker";
import { Pagination } from "./Pagination";
import { TableView } from "./views/TableView";
import { ListView } from "./views/ListView";
import { GridView } from "./views/GridView";
import { GalleryView } from "./views/GalleryView";
import { type ColumnMetadata } from "@/server/db/introspection";
import {
  type TableConfig,
  type TableName,
  type ViewType,
} from "@/lib/table-registry";
import { useRouter } from "next/navigation";

interface TableExplorerShellProps {
  table: TableName;
  config: TableConfig;
  columns: ColumnMetadata[];
  rows: Record<string, unknown>[];
  totalCount: number;
  currentView: ViewType;
  currentPage: number;
  pageSize: number;
  currentSort?: string;
  currentDir: "asc" | "desc";
}

export function TableExplorerShell({
  table,
  config,
  columns,
  rows,
  totalCount,
  currentView,
  currentPage,
  pageSize,
  currentSort,
  currentDir,
}: TableExplorerShellProps) {
  const router = useRouter();

  // Initialize visible columns (exclude hidden by default)
  const defaultVisibleColumns = useMemo(
    () => columns.filter((c) => !c.isHidden).map((c) => c.column_name),
    [columns],
  );

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    defaultVisibleColumns,
  );

  const handleRefresh = () => {
    router.refresh();
  };

  const renderView = () => {
    switch (currentView) {
      case "list":
        return <ListView table={table} config={config} rows={rows} />;
      case "grid":
        return (
          <GridView
            table={table}
            config={config}
            columns={columns}
            rows={rows}
          />
        );
      case "gallery":
        return <GalleryView table={table} config={config} rows={rows} />;
      case "table":
      default:
        return (
          <TableView
            table={table}
            config={config}
            columns={columns}
            rows={rows}
            visibleColumns={visibleColumns}
            currentSort={currentSort}
            currentDir={currentDir}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SearchBar placeholder={`Search ${config.label.toLowerCase()}...`} />
        </div>

        <div className="flex items-center gap-2">
          <ViewSwitcher
            currentView={currentView}
            enabledViews={config.viewsEnabled}
          />

          {currentView === "table" && (
            <ColumnPicker
              columns={columns}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
            />
          )}

          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleRefresh}
            title="Refresh"
          >
            <RefreshCw />
          </Button>

          {config.permissions.create && (
            <Button asChild>
              <Link href={`/admin/tables/${table}/new`}>
                <Plus />
                New
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Count display */}
      <div className="text-sm text-muted-foreground">
        {totalCount} {totalCount === 1 ? "record" : "records"} found
      </div>

      {/* Main content area */}
      <div className="min-h-[400px]">{renderView()}</div>

      {/* Pagination */}
      <Pagination
        totalCount={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
      />
    </div>
  );
}
