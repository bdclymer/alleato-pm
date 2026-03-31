import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/layout";
import { Database } from "@/types/database.types";
import { DatabaseTablesCatalogClient } from "./database-tables-catalog-client";

type DatabaseTableCatalogRow =
  Database["public"]["Tables"]["database_tables_catalog"]["Row"];

export default async function DatabaseTablesCatalogPage() {
  const supabase = await createClient();

  const { data: catalogRows, error } = await supabase
    .from("database_tables_catalog")
    .select("*")
    .eq("schema_name", "public")
    .order("table_name", { ascending: true });

  if (error) {
    return (
      <PageShell variant="table" title="Database Tables Catalog" description="Catalog of tables in the public schema">
        <div className="p-6 text-center text-destructive">
          Error loading database tables catalog. Please try again later.
        </div>
      </PageShell>
    );
  }

  // Source of truth: actual tables currently in the public schema.
  // We keep catalog metadata when present, but only for real existing tables.
  const { data: publicTablesData, error: publicTablesError } = await supabase.rpc(
    "get_public_tables",
  );

  const catalogByTableName = new Map(
    ((catalogRows || []) as DatabaseTableCatalogRow[]).map((row) => [row.table_name, row]),
  );

  const publicTableNames = !publicTablesError && Array.isArray(publicTablesData)
    ? (publicTablesData as Array<{ table_name: string }>)
        .map((row) => row.table_name)
        .filter((name): name is string => Boolean(name))
        .sort((a, b) => a.localeCompare(b))
    : Array.from(catalogByTableName.keys()).sort((a, b) => a.localeCompare(b));

  const rows: DatabaseTableCatalogRow[] = publicTableNames.map((tableName) => {
    const catalog = catalogByTableName.get(tableName);
    if (catalog) return catalog;

    return {
      table_name: tableName,
      schema_name: "public",
      schema: null,
      category: null,
      status: null,
      row_count: null,
      rls_enabled: null,
      primary_keys: null,
      fk_columns: null,
      table_comment: null,
      notes: null,
      tools: null,
      created_at: null,
    };
  });

  return <DatabaseTablesCatalogClient initialRows={rows} />;
}
