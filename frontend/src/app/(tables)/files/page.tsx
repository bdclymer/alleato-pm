export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { FilesClient } from "./files-client";

export default async function FilesPage() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id, title, file_name, file_path, source_path, source_web_url, url, source_system, source, category, type, project_id, project, date, created_at, status, tags, division",
    )
    .eq("category", "document")
    .order("date", { ascending: false })
    .limit(10000);

  return <FilesClient items={data ?? []} errorMessage={error?.message ?? null} />;
}
