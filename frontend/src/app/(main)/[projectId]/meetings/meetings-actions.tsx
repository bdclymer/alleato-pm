"use client";

import { useRouter } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { CreateMeetingDialog } from "@/components/meetings/create-meeting-dialog";
import { Button } from "@/components/ui/button";

interface MeetingsActionsProps {
  projectId: string;
}

export function MeetingsActions({ projectId }: MeetingsActionsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        onClick={() => router.push(`/${projectId}/meetings/schedule`)}
      >
        <CalendarPlus />
        Schedule Meeting
      </Button>
      <CreateMeetingDialog
        projectId={projectId}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
