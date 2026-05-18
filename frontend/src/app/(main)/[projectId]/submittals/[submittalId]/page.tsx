import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { SubmittalDetailClient } from "@/features/submittals/submittal-detail-client";
import type { SubmittalDetail } from "@/hooks/use-submittals";
import { listLinkedPatternCDocuments } from "@/lib/documents/pattern-c-attachments";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
  params: Promise<{ projectId: string; submittalId: string }>;
}

export default async function SubmittalDetailPage({ params }: Props) {
  const { projectId, submittalId } = await params;
  const supabase = createServiceClient();

  const { data: submittal, error } = await supabase
    .from("submittals")
    .select(
      `*,
       submittal_type:submittal_types(id, name),
       submittal_package:submittal_packages(id, name),
       submittal_workflow_steps(
         id,
         step_order,
         step_type,
         submittal_responses(
           id,
           responder_id,
           response_status,
           comments,
           responded_at
         )
       ),
       submittal_distributions(
         id,
         from_id,
         message,
         distributed_at,
         submittal_distribution_recipients(id, recipient_id)
       ),
       submittal_linked_drawings(
         id,
         drawing_id
       ),
       submittal_history(
         id,
         action,
         actor_id,
         new_status,
         changes,
         occurred_at
       )`,
    )
    .eq("project_id", parseInt(projectId, 10))
    .eq("id", submittalId)
    .single();

  if (error || !submittal) {
    notFound();
  }

  const attachments = await listLinkedPatternCDocuments({
    supabase,
    serviceClient: supabase,
    entityType: "submittal",
    entityId: submittalId,
  });

  const submittalDetail: SubmittalDetail = {
    ...(submittal as Omit<SubmittalDetail, "responsible_contractor">),
    responsible_contractor: null,
    attachments: attachments.map((attachment) => ({
      id: attachment.document_metadata_id,
      file_name: attachment.file_name ?? attachment.title ?? "Attachment",
      file_url: attachment.download_url ?? "",
      file_size: attachment.source_size,
      content_type: attachment.mime_type,
      is_current: true,
      uploaded_by: null,
      created_at: attachment.attached_at,
    })),
  };

  return (
    <SubmittalDetailClient
      submittal={submittalDetail}
      projectId={parseInt(projectId, 10)}
    />
  );
}
