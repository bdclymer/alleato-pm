import { createClient } from "@/lib/supabase/server";
import {
  ProcoreToolsTableClient,
  type ProcoreToolRow,
} from "./procore-tools-table-client";

export default async function ProcoreToolsPage() {
  const supabase = await createClient();

  const { data: tools, error } = await supabase
    .from("procore_tools")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="text-center text-destructive">
        Error loading Procore tools. Please try again later.
      </div>
    );
  }

  return <ProcoreToolsTableClient tools={(tools ?? []) as ProcoreToolRow[]} />;
}
