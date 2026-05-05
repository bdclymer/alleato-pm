import { withApiGuardrails } from "@/lib/guardrails/api";
import { GuardrailError } from "@/lib/guardrails/errors";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiErrorResponse } from "@/lib/api-error";

export const GET = withApiGuardrails(
  "documents/status#GET",
  async () => {
  
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new GuardrailError({ code: "AUTH_EXPIRED", where: "documents/status#GET", message: "Authentication required." });
    }

    // Fetch document metadata with ingestion job status (left join — documents
    // without ingestion jobs still appear, pipeline_stage shows as "unknown")
    const { data: documents, error } = await supabase
      .from("document_metadata")
      .select(
        `
        id,
        fireflies_id,
        title,
        status,
        type,
        category,
        source,
        date,
        created_at,
        file_path,
        storage_bucket,
        url,
        project_id,
        fireflies_ingestion_jobs!fireflies_ingestion_jobs_metadata_id_fkey (
          stage,
          attempt_count,
          last_attempt_at,
          error_message
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[documents/status] Supabase query failed:", error);
      return NextResponse.json(
        { error: `Failed to fetch documents: ${error.message}` },
        { status: 500 },
      );
    }

    // Transform the data for easier consumption
    const transformedDocuments =
      documents?.map((doc) => ({
        id: doc.id,
        fireflies_id: doc.fireflies_id,
        title: doc.title,
        status: doc.status,
        type: doc.type,
        category: doc.category,
        source: doc.source,
        date: doc.date,
        created_at: doc.created_at,
        file_path: doc.file_path,
        storage_bucket: doc.storage_bucket,
        url: doc.url,
        project_id: doc.project_id,
        pipeline_stage: doc.fireflies_ingestion_jobs[0]?.stage || "unknown",
        attempt_count: doc.fireflies_ingestion_jobs[0]?.attempt_count || 0,
        last_attempt_at: doc.fireflies_ingestion_jobs[0]?.last_attempt_at,
        error_message: doc.fireflies_ingestion_jobs[0]?.error_message,
      })) || [];

    return NextResponse.json({ documents: transformedDocuments });
    },
);
