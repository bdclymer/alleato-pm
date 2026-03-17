"use client";

import type { ReactElement } from "react";
import {
  ArrowUpRight,
  Flame,
  FileText,
  Keyboard,
  Lightbulb,
  Link as LinkIcon,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function extractNotesFromContent(content: string | null | undefined): string | null {
  if (!content) return null;
  const match = content.match(/##\s*Notes\s*([\s\S]*?)(?=\n##|$)/i);
  return match?.[1]?.trim() || null;
}

function KeyboardTipsPopover(): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Keyboard tips">
          <Lightbulb className="h-4.5 w-4.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-2 p-3">
        <p className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
          <Keyboard className="h-3.5 w-3.5" />
          Keyboard tips
        </p>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li>Arrow Up/Down (or J/K): move selection</li>
          <li>Enter: open selected meeting page</li>
          <li>Tab / Shift+Tab while editing: save and move cell</li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function MeetingPreviewPane({
  meeting,
  onOpenMeetingPage,
}: MeetingPreviewPaneProps): ReactElement {
  if (!meeting) {
    return (
      <div className="p-8 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">Meeting preview</p>
          <KeyboardTipsPopover />
        </div>
        <p className="text-sm text-muted-foreground">Select a row to preview details here.</p>
      </div>
    );
  }

  const participants = parseParticipants(meeting).map(getParticipantDisplayName);
  const hasExternalLinks = Boolean(meeting.source || meeting.fireflies_link || meeting.url);
  const firefliesNotes = meeting.notes?.trim() || extractNotesFromContent(meeting.content);

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight pb-2">
              {meeting.title || "Untitled meeting"}
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              <span>{formatDateTime(meeting.date)}</span>
              {meeting.project ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{meeting.project}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <KeyboardTipsPopover />
            <Button
              size="xs"
              variant="default"
              onClick={() => onOpenMeetingPage(meeting)}
              className="shrink-0"
            >
              View
              <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {meeting.description ? (
        <section className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-foreground">Description</p>
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {meeting.description}
          </p>
        </section>
      ) : null}

      {firefliesNotes ? (
        <section className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-foreground">Fireflies Notes</p>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {firefliesNotes}
          </p>
        </section>
      ) : null}

      {hasExternalLinks ? (
        <section className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-foreground">Links</p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onOpenMeetingPage(meeting)}
              className="inline-flex items-center text-primary/70 hover:text-primary transition-colors p-1"
              title="Meeting detail"
              aria-label="Open meeting detail page"
            >
              <FileText className="h-5 w-5" strokeWidth={1.5} />
            </button>
            {meeting.fireflies_link ? (
              <a
                href={meeting.fireflies_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary/70 hover:text-primary transition-colors p-1"
                title="Recording"
                aria-label="Open recording"
              >
                <Flame className="h-5 w-5" strokeWidth={1.5} />
              </a>
            ) : null}
            {meeting.url ? (
              <a
                href={meeting.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-primary/70 hover:text-primary transition-colors p-1"
                title="Source URL"
                aria-label="Open source URL"
              >
                <LinkIcon className="h-5 w-5" strokeWidth={1.5} />
              </a>
            ) : null}
          </div>
        </section>
      ) : null}

      {participants.length > 0 ? (
        <section className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold text-foreground inline-flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Participants ({participants.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {participants.slice(0, 12).map((participant) => (
              <span
                key={`preview-participant-${meeting.id}-${participant}`}
                className="inline-flex items-center rounded-md border px-2 py-1 text-xs font-normal text-muted-foreground"
              >
                {participant}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
