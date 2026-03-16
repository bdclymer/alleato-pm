import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database.types";
import { DatabaseTablesCatalogClient } from "./database-tables-catalog-client";

type DatabaseTableCatalogRow =
  Database["public"]["Tables"]["database_tables_catalog"]["Row"];

export default async function DatabaseTablesCatalogPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("database_tables_catalog")
    .select("*")
    .eq("schema_name", "public")
    .order("table_name", { ascending: true });

  if (error) {
    return <div className="text-center text-destructive p-6">Error loading database tables catalog. Please try again later.</div>;
  }

  return <DatabaseTablesCatalogClient initialRows={(data || []) as DatabaseTableCatalogRow[]} />;
}
