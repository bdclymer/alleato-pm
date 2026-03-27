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

/**
 * Render markdown-ish text into simple formatted HTML.
 * Handles: **bold**, ## headings, bullet lists, and paragraphs.
 */
function FormattedNotes({ text }: { text: string }): ReactElement {
  const lines = text.split("\n");
  const elements: ReactElement[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc pl-4 space-y-1">
          {listItems.map((item) => (
            <li key={item.slice(0, 60)}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  }

  function renderInline(str: string): ReactElement {
    // Handle **bold** spans
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return (
      <>
        {parts.map((part) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <span key={`b-${part}`} className="font-semibold text-foreground">
                {part.slice(2, -2)}
              </span>
            );
          }
          return <span key={`t-${part.slice(0, 40)}`}>{part}</span>;
        })}
      </>
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Headings: ## or ###
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      flushList();
      elements.push(
        <p key={`h-${i}`} className="font-semibold text-foreground pt-2 first:pt-0">
          {renderInline(headingMatch[1])}
        </p>,
      );
      continue;
    }

    // Bullet items: - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      continue;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${i}`}>{renderInline(trimmed)}</p>,
    );
  }

  flushList();

  return <div className="space-y-2">{elements}</div>;
}

function KeyboardTipsPopover(): ReactElement {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Keyboard tips">
          <Lightbulb />
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
    <div className="p-8 space-y-6 overflow-y-auto h-full">
      {/* Header: title, date, project, links, actions */}
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
              <ArrowUpRight />
            </Button>
          </div>
        </div>

        {/* External links — directly under the date line */}
        {hasExternalLinks ? (
          <div className="flex items-center gap-4">
            {meeting.source ? (
              <a
                href={meeting.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
                title="Transcript"
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Transcript</span>
              </a>
            ) : null}
            {meeting.fireflies_link ? (
              <a
                href={meeting.fireflies_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
                title="Recording"
              >
                <Flame className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Recording</span>
              </a>
            ) : null}
            {meeting.url ? (
              <a
                href={meeting.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
                title="Source"
              >
                <LinkIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Source</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Description */}
      {meeting.description ? (
        <section className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-foreground">Description</p>
          <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {meeting.description}
          </p>
        </section>
      ) : null}

      {/* Fireflies Notes — formatted markdown */}
      {firefliesNotes ? (
        <section className="space-y-2 border-t pt-4">
          <p className="text-xs font-semibold text-foreground">Notes</p>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <FormattedNotes text={firefliesNotes} />
          </div>
        </section>
      ) : null}

      {/* Participants */}
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
