export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { DocumentMetadataClient } from "./document-metadata-client";

export default async function DocumentMetadataPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("document_metadata")
    .select(
      "id, title, type, source, source_system, summary, date, created_at, status, participants, project_id, project, phase, category, division, duration_minutes, meeting_type, host_email, organizer_email, url, fireflies_link",
    )
    .order("date", { ascending: false })
    .limit(50000);

  return (
    <DocumentMetadataClient
      items={data ?? []}
      errorMessage={error?.message ?? null}
    />
  );
}
