import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { SubmittalDetailClient } from "@/features/submittals/submittal-detail-client";

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
       submittal_attachments(
         id,
         file_name,
         file_url,
         file_size,
         content_type,
         is_current,
         uploaded_by,
         created_at
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

  return (
    <SubmittalDetailClient
      submittal={submittal as Parameters<typeof SubmittalDetailClient>[0]["submittal"]}
      projectId={parseInt(projectId, 10)}
    />
  );
}
