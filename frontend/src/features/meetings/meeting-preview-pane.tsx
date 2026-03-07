"use client";

import type { ReactElement } from "react";
import { ArrowUpRight, Flame, FileText, Keyboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Meeting } from "@/lib/validation/meetings";

interface MeetingPreviewPaneProps {
  meeting: Meeting | null;
  onOpenMeetingPage: (meeting: Meeting) => void;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No date";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MeetingPreviewPane({
  meeting,
  onOpenMeetingPage,
}: MeetingPreviewPaneProps): ReactElement {
  if (!meeting) {
    return (
      <div className="p-6 space-y-5">
        <p className="text-sm font-medium text-foreground">Meeting preview</p>
        <p className="text-sm text-muted-foreground">
          Select a row to preview details here.
        </p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <Keyboard className="h-3.5 w-3.5" />
            Arrow Up/Down (or J/K): move selection
          </p>
          <p>Enter: open selected meeting page</p>
          <p>Tab / Shift+Tab while editing: save and move cell</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-foreground leading-tight pr-2">
            {meeting.title || "Untitled meeting"}
          </p>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Open meeting detail page"
            title="Open meeting detail page"
            onClick={() => onOpenMeetingPage(meeting)}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>

        {meeting.date ? (
          <p className="text-xs text-muted-foreground">{formatDateTime(meeting.date)}</p>
        ) : null}
      </div>
      <dl className="space-y-3 text-xs">
        {meeting.project ? (
          <div>
            <dt className="text-muted-foreground">Project</dt>
            <dd className="text-foreground mt-1">{meeting.project}</dd>
          </div>
        ) : null}
        {meeting.type ? (
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="text-foreground mt-1">{meeting.type}</dd>
          </div>
        ) : null}
        {meeting.category ? (
          <div>
            <dt className="text-muted-foreground">Category</dt>
            <dd className="text-foreground mt-1">{meeting.category}</dd>
          </div>
        ) : null}
        {meeting.participants ? (
          <div>
            <dt className="text-muted-foreground">Participants</dt>
            <dd className="text-foreground mt-1 line-clamp-3">{meeting.participants}</dd>
          </div>
        ) : null}
        {meeting.summary ? (
          <div>
            <dt className="text-muted-foreground">Summary</dt>
            <dd className="text-foreground mt-1 line-clamp-6">{meeting.summary}</dd>
          </div>
        ) : null}
      </dl>

      {(meeting.source || meeting.fireflies_link) && (
        <div className="pt-2">
          <div className="flex items-center gap-2">
            {meeting.source && (
              <Button
                asChild
                size="icon"
                variant="ghost"
                aria-label="Open transcript"
                title="Open transcript"
              >
                <a href={meeting.source} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4" />
                </a>
              </Button>
            )}
            {meeting.fireflies_link && (
              <Button
                asChild
                size="icon"
                variant="ghost"
                aria-label="Open recording"
                title="Open recording"
              >
                <a href={meeting.fireflies_link} target="_blank" rel="noopener noreferrer">
                  <Flame className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
