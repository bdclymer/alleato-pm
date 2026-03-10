"use client";

import type { ReactElement } from "react";
import { ArrowUpRight, CalendarClock, Flame, FileText, Keyboard, Link as LinkIcon, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Meeting } from "@/lib/validation/meetings";
import { getParticipantDisplayName, parseParticipants } from "@/features/meetings/meetings-table-config";

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

  const participants = parseParticipants(meeting).map(getParticipantDisplayName);
  const hasExternalLinks = Boolean(meeting.source || meeting.fireflies_link || meeting.url);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold text-foreground leading-tight">
              {meeting.title || "Untitled meeting"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {meeting.status ? <Badge variant="outline">{meeting.status}</Badge> : null}
              {meeting.type ? <Badge variant="secondary">{meeting.type}</Badge> : null}
              {meeting.category ? <Badge variant="outline">{meeting.category}</Badge> : null}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenMeetingPage(meeting)}
            className="shrink-0"
          >
            Open
            <ArrowUpRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <CalendarClock className="h-3.5 w-3.5" />
            {formatDateTime(meeting.date)}
          </p>
          {meeting.project ? <p>Project: {meeting.project}</p> : null}
        </div>
      </div>

      {participants.length > 0 ? (
        <section className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Participants ({participants.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.slice(0, 12).map((participant) => (
              <Badge key={`preview-participant-${meeting.id}-${participant}`} variant="secondary" className="font-normal">
                {participant}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {meeting.summary ? (
        <section className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-foreground">Summary</p>
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {meeting.summary}
          </p>
        </section>
      ) : null}

      {meeting.description ? (
        <section className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-foreground">Description</p>
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {meeting.description}
          </p>
        </section>
      ) : null}

      {hasExternalLinks ? (
        <section className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-foreground">Links</p>
          <div className="flex flex-col gap-1">
            {meeting.source ? (
              <a href={meeting.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <FileText className="h-3.5 w-3.5" />
                Transcript
              </a>
            ) : null}
            {meeting.fireflies_link ? (
              <a href={meeting.fireflies_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Flame className="h-3.5 w-3.5" />
                Recording
              </a>
            ) : null}
            {meeting.url ? (
              <a href={meeting.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <LinkIcon className="h-3.5 w-3.5" />
                Source URL
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
        <p className="inline-flex items-center gap-2">
          <Keyboard className="h-3.5 w-3.5" />
          Arrow Up/Down (or J/K): move selection
        </p>
        <p>Enter: open selected meeting page</p>
      </section>
    </div>
  );
}
