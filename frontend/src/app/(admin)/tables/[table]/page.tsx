import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableExplorerShell } from "@/components/admin/table-explorer";
import { listRows } from "@/server/db/crud";
import { getColumnMetadata } from "@/server/db/introspection";
import {
  isTableAllowed,
  getTableConfig,
  type TableName,
  type ViewType,
} from "@/lib/table-registry";

interface TableExplorerPageProps {
  params: Promise<{ table: string }>;
  searchParams: Promise<{
    view?: string;
    q?: string;
    sort?: string;
    dir?: string;
    page?: string;
    limit?: string;
    [key: string]: string | undefined;
  }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;

  if (!isTableAllowed(table)) {
    return { title: "Table Not Found" };
  }

  const config = getTableConfig(table as TableName);
  return {
    title: `${config.label} | Admin Table Explorer`,
    description: config.description,
  };
}

export default async function TableExplorerPage({
  params,
  searchParams,
}: TableExplorerPageProps) {
  const { table } = await params;
  const search = await searchParams;

  // Validate table
  if (!isTableAllowed(table)) {
    notFound();
  }

  const tableName = table as TableName;
  const config = getTableConfig(tableName);

  // Parse search params
  const view = (search.view as ViewType) ?? "table";
  const query = search.q ?? "";
  const sort = search.sort;
  const dir = (search.dir as "asc" | "desc") ?? config.defaultSort.direction;
  const page = parseInt(search.page ?? "1", 10);
  const limit = Math.min(parseInt(search.limit ?? "25", 10), 200);
  const offset = (page - 1) * limit;

  // Extract filters (keys that start with 'filter_')
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(search)) {
    if (key.startsWith("filter_") && value) {
      filters[key.replace("filter_", "")] = value;
    }
  }

  // Fetch data
  const [columnsResult, rowsResult] = await Promise.all([
    getColumnMetadata(tableName),
    listRows({
      table: tableName,
      limit,
      offset,
      sort,
      dir,
      search: query,
      filters,
    }),
  ]);

  if (!rowsResult.success) {
    throw new Error(rowsResult.error ?? "Failed to load data");
  }

  const { rows, count } = rowsResult.data!;

  return (
    <div className="container max-w-7xl py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/tables">
              <ArrowLeft className="mr-2 h-4 w-4" />
              All Tables
            </Link>
          </Button>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{config.label}</h1>
        <p className="text-muted-foreground">{config.description}</p>
      </div>

      {/* Explorer */}
      <TableExplorerShell
        table={tableName}
        config={config}
        columns={columnsResult}
        rows={rows}
        totalCount={count}
        currentView={config.viewsEnabled.includes(view) ? view : "table"}
        currentPage={page}
        pageSize={limit}
        currentSort={sort}
        currentDir={dir}
      />
    </div>
  );
}
