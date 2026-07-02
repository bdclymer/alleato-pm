"use client";

import { useParams, useRouter } from "next/navigation";

import { PageShell } from "@/components/layout";
import { CreateMeetingForm } from "@/components/domain/meetings/create-meeting-form";

export default function NewMeetingPage() {
  const params = useParams<{ projectId: string }>()!;
  const router = useRouter();
  const projectId = params.projectId ?? "";

  return (
    <PageShell
      variant="form"
      title="Create Meeting"
      description="Start a structured project meeting. Each new meeting begins with an Uncategorized Items agenda section."
      onBack={() => router.push(`/${projectId}/meetings`)}
    >
      <CreateMeetingForm projectId={projectId} />
    </PageShell>
  );
}
