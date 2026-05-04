export const dynamic = "force-dynamic";

import { PageShell } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import { DocumentMetadataClient } from "./document-metadata-client";

export default async function DocumentMetadataPage() {
  const supabase = await createClient();

  const [{ data, error }, { data: projectRows }] = await Promise.all([
    supabase
      .from("document_metadata")
      .select(
        "id, title, type, source, source_system, content, summary, date, created_at, status, participants, project_id, project, phase, category, division, duration_minutes, meeting_type, host_email, organizer_email, url, fireflies_link, tags, file_name, file_path, source_web_url, keywords",
      )
      .order("date", { ascending: false })
      .limit(50000),
    supabase
      .from("projects")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  const allProjects = (projectRows ?? []).map((p) => ({ id: p.id as number, name: p.name as string }));

  return (
    <PageShell variant="table" title="Document Metadata" showHeader={false}>
      <DocumentMetadataClient
        items={data ?? []}
        errorMessage={error?.message ?? null}
        allProjects={allProjects}
      />
    </PageShell>
  );
}
