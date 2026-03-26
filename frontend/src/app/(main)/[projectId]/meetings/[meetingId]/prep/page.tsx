"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  Tag,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ds";
import { Editor } from "@/components/text-editor";
import { useMeeting } from "@/hooks/use-meetings";
import {
  useMeetingPrep,
  useSaveMeetingPrep,
  useGenerateMeetingPrep,
} from "@/hooks/use-meeting-prep";

export default function MeetingPrepPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const meetingId = params.meetingId as string;

  const { data: meetingResult, isLoading: meetingLoading } = useMeeting(
    projectId,
    meetingId
  );
  const { data: prepResult, isLoading: prepLoading } = useMeetingPrep(
    projectId,
    meetingId
  );
  const savePrep = useSaveMeetingPrep(projectId, meetingId);
  const generatePrep = useGenerateMeetingPrep(projectId, meetingId);

  const meeting = meetingResult?.data;
  const prep = prepResult?.data;

  const [content, setContent] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize content from existing prep
  useEffect(() => {
    if (!hasInitialized && prep?.content) {
      setContent(prep.content);
      setHasInitialized(true);
    } else if (!hasInitialized && !prepLoading && !prep) {
      setHasInitialized(true);
    }
  }, [prep, prepLoading, hasInitialized]);

  // Auto-save handler with debounce
  const handleSaveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      setContent(updatedContent);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (debounce) {
        saveTimeoutRef.current = setTimeout(() => {
          savePrep.mutate(updatedContent);
        }, 1500);
      } else {
        savePrep.mutate(updatedContent);
      }
    },
    [savePrep]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // AI generation handler
  const handleGenerate = async () => {
    if (
      content &&
      !window.confirm(
        "This will replace your current meeting prep. Continue?"
      )
    ) {
      return;
    }

    try {
      const result = await generatePrep.mutateAsync();
      setContent(result.data.content);
    } catch {
      // Error handled by mutation onError
    }
  };

  if (meetingLoading || prepLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  if (!meeting) {
    return (
      <PageContainer>
        <div className="py-20 text-center text-muted-foreground">
          Meeting not found
        </div>
      </PageContainer>
    );
  }

  const formattedDate = meeting.date
    ? format(new Date(meeting.date), "EEEE, MMMM d, yyyy 'at' h:mm a")
    : "Date TBD";

  return (
    <PageContainer>
      {/* Back link */}
      <div className="mb-6">
        <Link
          href={`/${projectId}/meetings`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Meetings
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {meeting.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
              {meeting.duration_minutes && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {meeting.duration_minutes} min
                </span>
              )}
              {meeting.category && (
                <span className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />
                  {meeting.category}
                </span>
              )}
              {meeting.status && (
                <StatusBadge status={meeting.status} />
              )}
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generatePrep.isPending}
            className="shrink-0"
          >
            {generatePrep.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles />
            )}
            {generatePrep.isPending
              ? "Generating..."
              : content
                ? "Regenerate Prep"
                : "Generate Meeting Prep"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* Canvas / Editor */}
        <div>
          {generatePrep.isPending ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-sm font-medium">
                Analyzing project data and generating meeting prep...
              </p>
              <p className="text-xs mt-1">This may take 15-30 seconds</p>
            </div>
          ) : content ? (
            <div className="rounded-md border bg-card p-6">
              <Editor
                content={content}
                onSaveContent={handleSaveContent}
                status="idle"
                isCurrentVersion={true}
                currentVersionIndex={0}
                suggestions={[]}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 rounded-md border border-dashed">
              <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium mb-1">
                No meeting prep yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">
                Generate an AI-powered meeting prep that analyzes your project
                data, last meeting insights, and current status — or start
                writing from scratch.
              </p>
              <div className="flex items-center gap-3">
                <Button onClick={handleGenerate}>
                  <Sparkles />
                  Generate Meeting Prep
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setContent(
                      `# Meeting Prep: ${meeting.title}\n\n## Agenda\n\n- \n\n## Notes\n\n`
                    );
                  }}
                >
                  Start from Scratch
                </Button>
              </div>
            </div>
          )}

          {/* Save indicator */}
          {content && (
            <div className="mt-2 text-xs text-muted-foreground">
              {savePrep.isPending
                ? "Saving..."
                : prep?.updated_at
                  ? `Last saved ${format(new Date(prep.updated_at), "h:mm a")}`
                  : "Auto-saves as you type"}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Meeting Details */}
          <SidebarSection title="Meeting Details">
            <div className="space-y-2 text-sm">
              {meeting.participants && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
                    Attendees
                  </p>
                  <p>{meeting.participants}</p>
                </div>
              )}
              {meeting.description && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1">
                    Purpose
                  </p>
                  <p>{meeting.description}</p>
                </div>
              )}
            </div>
          </SidebarSection>

          {/* Quick Links */}
          <SidebarSection title="Project Tools">
            <div className="space-y-1">
              {[
                { label: "Budget", path: "budget" },
                { label: "Change Orders", path: "change-orders" },
                { label: "RFIs", path: "rfis" },
                { label: "Schedule", path: "schedule" },
                { label: "Commitments", path: "commitments" },
              ].map((link) => (
                <Link
                  key={link.path}
                  href={`/${projectId}/${link.path}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.label}
                </Link>
              ))}
            </div>
          </SidebarSection>

          {/* Prep Info */}
          {prep && (
            <SidebarSection title="Prep Info">
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p>Version {prep.version}</p>
                <p>Generated by: {prep.generated_by}</p>
                {prep.generation_time_ms && (
                  <p>
                    Generation time:{" "}
                    {(prep.generation_time_ms / 1000).toFixed(1)}s
                  </p>
                )}
                {prep.model_used && <p>Model: {prep.model_used}</p>}
              </div>
            </SidebarSection>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}

// Sidebar section component
function SidebarSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
