"use client";

import * as React from "react";

import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FolderOpen,
  MessageSquare,
  Users,
  X,
} from "lucide-react";

import { StatusBadge } from "@/components/ds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentMetadataItem {
  id: string;
  title: string | null;
  type: string | null;
  source: string | null;
  source_system: string | null;
  content: string | null;
  summary: string | null;
  date: string | null;
  created_at: string | null;
  status: string | null;
  participants: string | null;
  project_id: number | null;
  project: string | null;
  phase: string;
  category: string | null;
  division: string | null;
  duration_minutes: number | null;
  meeting_type: string | null;
  host_email: string | null;
  organizer_email: string | null;
  url: string | null;
  fireflies_link: string | null;
}

interface DocumentMetadataSheetProps {
  item: DocumentMetadataItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (direction: "prev" | "next") => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(minutes: number | null) {
  if (minutes == null) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function typeLabel(type: string | null) {
  if (!type) return "Document";
  const map: Record<string, string> = {
    meeting: "Meeting",
    teams_dm: "Teams DM",
    teams_dm_conversation: "Teams Conversation",
    teams_message: "Teams Message",
    email: "Email",
    document: "Document",
  };
  return map[type] ?? type;
}

// ── Section component ─────────────────────────────────────────────────────────

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

// ── Sheet component ───────────────────────────────────────────────────────────

export function DocumentMetadataSheet({
  item,
  open,
  onOpenChange,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
}: DocumentMetadataSheetProps) {
  // Keyboard nav
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" && onNavigate && canNavigatePrev) {
        e.preventDefault();
        onNavigate("prev");
      } else if (e.key === "ArrowDown" && onNavigate && canNavigateNext) {
        e.preventDefault();
        onNavigate("next");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onNavigate, canNavigatePrev, canNavigateNext]);

  if (!item) return null;

  const link = item.fireflies_link ?? item.url;
  const host = item.host_email ?? item.organizer_email;
  const participantList = item.participants
    ? item.participants.split(/[,;|\n]+/).map((p) => p.trim()).filter(Boolean)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col bg-card"
        style={{ width: "560px", maxWidth: "100vw" }}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="text-xs shrink-0">
                  {typeLabel(item.type)}
                </Badge>
                {item.status && <StatusBadge status={item.status} />}
                {item.source_system && (
                  <span className="text-xs text-muted-foreground">
                    {item.source_system}
                  </span>
                )}
              </div>
              <SheetTitle className="text-base font-semibold leading-snug">
                {item.title ?? "Untitled"}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {onNavigate && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!canNavigatePrev}
                    onClick={() => onNavigate("prev")}
                    title="Previous (↑)"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!canNavigateNext}
                    onClick={() => onNavigate("next")}
                    title="Next (↓)"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Meta strip */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            {item.date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(item.date)}
              </span>
            )}
            {item.duration_minutes != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(item.duration_minutes)}
              </span>
            )}
            {item.project && (
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" />
                {item.project}
              </span>
            )}
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Open source
              </a>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* Content — full text, no truncation */}
            {item.content && (
              <Section label="Content">
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {item.content}
                </p>
              </Section>
            )}

            {/* Summary */}
            {item.summary && (
              <>
                {item.content && <Separator />}
                <Section label="Summary">
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {item.summary}
                  </p>
                </Section>
              </>
            )}

            {/* Participants */}
            {participantList.length > 0 && (
              <>
                <Separator />
                <Section label="Participants">
                  <div className="flex flex-wrap gap-1.5">
                    {participantList.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs"
                      >
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {p}
                      </span>
                    ))}
                  </div>
                </Section>
              </>
            )}

            {/* Details grid */}
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              {host && (
                <Section label="Host">
                  <span className="text-sm">{host}</span>
                </Section>
              )}
              {item.meeting_type && (
                <Section label="Meeting Type">
                  <span className="text-sm">{item.meeting_type}</span>
                </Section>
              )}
              {item.category && (
                <Section label="Category">
                  <span className="text-sm">{item.category}</span>
                </Section>
              )}
              {item.division && (
                <Section label="Division">
                  <span className="text-sm">{item.division}</span>
                </Section>
              )}
              {item.phase && (
                <Section label="Phase">
                  <span className="text-sm">{item.phase}</span>
                </Section>
              )}
              {item.source && (
                <Section label="Source">
                  <span className="text-sm">{item.source}</span>
                </Section>
              )}
            </div>

            {/* Footer meta */}
            {item.created_at && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Added {formatDateTime(item.created_at)}
                </p>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
