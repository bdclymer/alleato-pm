export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase/service";
import { FilesClient } from "./files-client";

export default async function FilesPage() {
  const supabase = createServiceClient();

  const [{ data, error }, { data: projectsData }] = await Promise.all([
    supabase
      .from("document_metadata")
      .select(
        "id, title, file_name, file_path, source_path, source_web_url, url, source_system, source, category, type, document_type, project_id, project, date, created_at, status, tags, division, source_last_modified_at, source_size, overview, participants, access_level",
      )
      .or("category.not.in.(email,teams_message),category.is.null")
      .order("source_last_modified_at", { ascending: false, nullsFirst: false })
      .limit(10000),
    supabase.from("projects").select("id, name").order("name"),
  ]);

  const projects = (projectsData ?? []).map((p) => ({ id: p.id as number, name: p.name as string }));

  return <FilesClient items={data ?? []} projects={projects} errorMessage={error?.message ?? null} />;
}
