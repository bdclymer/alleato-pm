"use client";

import { useRouter } from "next/navigation";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";

interface MeetingsActionsProps {
  projectId: string;
}

export function MeetingsActions({ projectId }: MeetingsActionsProps) {
  const router = useRouter();

  return (
    <CreateMeetingDialog
      projectId={projectId}
      onSuccess={() => router.refresh()}
    />
  );
}
