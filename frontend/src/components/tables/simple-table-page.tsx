import { createClient } from "@/lib/supabase/server";
import { listRuntimeTableRows } from "@/lib/supabase/runtime-table";
import {
  GenericDataTable,
  type GenericTableConfig,
} from "@/components/tables/generic-table-factory";
import { PageHeader } from "@/components/layout";
import type { Database } from "@/types/database.types";

type TableName = keyof Database["public"]["Tables"];

interface SimpleTablePageProps {
  tableName: TableName;
  config: GenericTableConfig;
}

/**
 * Ultra-simple table page component
 * Just pass in a table name and config, and you get a full page with header and data table
 *
 * DEPRECATION NOTICE:
 * This helper is legacy because it depends on GenericDataTable.
 * Use UnifiedTablePage for all new table pages.
 *
 * NO STYLING - Layout provides PageContainer
 * This component ONLY renders: PageHeader + GenericDataTable
 */
/**
 * @deprecated Use UnifiedTablePage from "@/components/tables/unified" for new pages.
 */
export async function SimpleTablePage({
  tableName,
  config,
}: SimpleTablePageProps) {
  const supabase = await createClient();

  const { data, error } = await listRuntimeTableRows(supabase, tableName);

  const title: string = config.title || "Data";
  const description: string = config.description || "";

  if (error) {
    return (
      <>
        <PageHeader title={title} description={description} />
        <div className="text-center text-destructive p-6">
          Error loading data. Please try again later.
        </div>
      </>
    );
  }

  return (
      <>
        <PageHeader title={title} description={description} />
      <GenericDataTable data={data ?? []} config={config} />
      </>
  );
}
